import hashlib
import os
import re
from typing import TypedDict, List, Any, Optional
import httpx

from app.core.config import settings
from app.agent.prompts import (
    COMMONALITIES_SYSTEM_PROMPT,
    COMMONALITIES_USER_TEMPLATE,
    GENERATOR_SYSTEM_PROMPT,
    GENERATOR_USER_TEMPLATE,
    GUARDRAILS_SYSTEM_PROMPT,
    GUARDRAILS_USER_TEMPLATE,
    get_default_icebreakers,
)
from langgraph.graph import StateGraph, START, END
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks.manager import CallbackManagerForLLMRun

# Initialize LangSmith environment variables if configured
if settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT

class HFInferenceAPILLM(LLM):
    """Custom LangChain LLM wrapper that calls the Hugging Face OpenAI-compatible completions API.
    This handles model routing automatically while maintaining LangChain & LangSmith tracing compatibility.
    """
    model_id: str
    token: str

    @property
    def _llm_type(self) -> str:
        return "hf_inference_api"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """Call Hugging Face Inference API Router."""
        # Parse Llama 3 format if present to send structured messages
        messages = []
        system_match = re.search(r"<\|start_header_id\|>system<\|end_header_id\|>\n\n(.*?)<\|eot_id\|>", prompt, re.DOTALL)
        user_match = re.search(r"<\|start_header_id\|>user<\|end_header_id\|>\n\n(.*?)<\|eot_id\|>", prompt, re.DOTALL)
        
        if system_match and user_match:
            messages.append({"role": "system", "content": system_match.group(1).strip()})
            messages.append({"role": "user", "content": user_match.group(1).strip()})
        else:
            messages.append({"role": "user", "content": prompt})

        # Resolve model name mapping for deprecated models
        target_model = self.model_id
        if target_model == "meta-llama/Meta-Llama-3-8B-Instruct":
            target_model = "meta-llama/Llama-3.1-8B-Instruct:deepinfra"

        try:
            response = httpx.post(
                "https://router.huggingface.co/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "model": target_model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 512,
                },
                timeout=20.0,
            )
            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"].strip()
                raise ValueError(f"Unexpected response format: {data}")
            else:
                raise ValueError(f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[HFInferenceAPILLM] Error: {e}")
            raise e

# Initialize custom LLM wrapper
llm = None
if settings.HF_ACCESS_TOKEN and settings.HF_MODEL:
    llm = HFInferenceAPILLM(
        model_id=settings.HF_MODEL,
        token=settings.HF_ACCESS_TOKEN
    )

def format_llama_prompt(system_prompt: str, user_prompt: str) -> str:
    """Format prompts for the Llama 3 Instruct model."""
    return (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        f"{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
        f"{user_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    )

def _normalize(vector: list[float]) -> list[float]:
    """Normalize a vector to unit length in-place (L2 norm)."""
    magnitude = sum(x * x for x in vector) ** 0.5
    return [x / magnitude for x in vector] if magnitude > 0 else vector

def _pad_or_truncate(vector: list[float], size: int = 1536) -> list[float]:
    """Ensure vector is exactly `size` dimensions."""
    if len(vector) > size:
        return vector[:size]
    if len(vector) < size:
        return vector + [0.0] * (size - len(vector))
    return vector

# LangGraph Definitions for Icebreaker Agent
class IcebreakerState(TypedDict):
    role_perspective: str  # "host" or "guest"
    host_city: str
    host_kashrut: str
    host_religious: str
    host_free_text: str
    guest_status: str
    guest_dietary: str
    guest_preference: str
    guest_skills: str
    commonalities: str
    raw_questions: str
    checked_questions: str
    icebreakers: List[str]

def analyze_commonalities_node(state: IcebreakerState) -> dict:
    """Node 1: Analyze similarities and differences between host and guest."""
    if not llm:
        return {"commonalities": "No LLM configured. Skipping commonalities analysis."}
        
    user_prompt = COMMONALITIES_USER_TEMPLATE.format(
        host_city=state.get("host_city") or "Unknown",
        host_kashrut=state.get("host_kashrut") or "Unknown",
        host_religious=state.get("host_religious") or "Unknown",
        host_free_text=state.get("host_free_text") or "None",
        guest_status=state.get("guest_status") or "Regular Guest",
        guest_dietary=state.get("guest_dietary") or "None",
        guest_preference=state.get("guest_preference") or "None",
        guest_skills=state.get("guest_skills") or "None"
    )
    
    prompt = format_llama_prompt(COMMONALITIES_SYSTEM_PROMPT, user_prompt)
    try:
        response = llm.invoke(prompt)
        return {"commonalities": response.strip()}
    except Exception as e:
        print(f"[LangGraph Node: analyze_commonalities] Error: {e}")
        return {"commonalities": f"Error during analysis: {e}"}

def generate_questions_node(state: IcebreakerState) -> dict:
    """Node 2: Generate 3 personalized icebreaker questions based on analyzed commonalities."""
    if not llm:
        return {"raw_questions": ""}
        
    role_str = "אורח" if state.get("role_perspective") == "guest" else "מארח"
    user_prompt = GENERATOR_USER_TEMPLATE.format(
        role_perspective=role_str,
        host_city=state.get("host_city") or "Unknown",
        host_kashrut=state.get("host_kashrut") or "Unknown",
        host_religious=state.get("host_religious") or "Unknown",
        host_free_text=state.get("host_free_text") or "None",
        guest_status=state.get("guest_status") or "Regular Guest",
        guest_dietary=state.get("guest_dietary") or "None",
        guest_preference=state.get("guest_preference") or "None",
        commonalities=state.get("commonalities") or "None"
    )
    
    prompt = format_llama_prompt(GENERATOR_SYSTEM_PROMPT, user_prompt)
    try:
        response = llm.invoke(prompt)
        return {"raw_questions": response.strip()}
    except Exception as e:
        print(f"[LangGraph Node: generate_questions] Error: {e}")
        return {"raw_questions": ""}

def guardrails_node(state: IcebreakerState) -> dict:
    """Node 3: Validate and filter questions for respectfulness and Shabbat appropriateness."""
    raw_questions = state.get("raw_questions", "")
    if not raw_questions:
        return {"checked_questions": ""}
    if not llm:
        return {"checked_questions": raw_questions}
        
    user_prompt = GUARDRAILS_USER_TEMPLATE.format(raw_questions=raw_questions)
    prompt = format_llama_prompt(GUARDRAILS_SYSTEM_PROMPT, user_prompt)
    try:
        response = llm.invoke(prompt)
        return {"checked_questions": response.strip()}
    except Exception as e:
        print(f"[LangGraph Node: guardrails] Error: {e}")
        return {"checked_questions": raw_questions}

def parse_and_validate_node(state: IcebreakerState) -> dict:
    """Node 4: Parse final questions, apply regex formatting, and filter/verify list."""
    checked = state.get("checked_questions", "")
    if not checked:
        checked = state.get("raw_questions", "")
        
    role = state.get("role_perspective", "host")
    default_icebreakers = get_default_icebreakers(role)
    
    if not checked:
        return {"icebreakers": default_icebreakers}
        
    lines = checked.split("\n")
    questions = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove markdown list prefixes, numeric lists like 1. 2. or bullet points
        clean = re.sub(r"^(\d+[\.\)]|\*|-)\s*", "", line).strip()
        if len(clean) > 8 and (clean.endswith("?") or "?" in clean):
            questions.append(clean)
            
    if len(questions) < 2:
        return {"icebreakers": default_icebreakers}
        
    return {"icebreakers": questions[:3]}

# Build the LangGraph workflow
workflow = StateGraph(IcebreakerState)
workflow.add_node("analyze_commonalities", analyze_commonalities_node)
workflow.add_node("generate_questions", generate_questions_node)
workflow.add_node("guardrails", guardrails_node)
workflow.add_node("parse_validate", parse_and_validate_node)

workflow.add_edge(START, "analyze_commonalities")
workflow.add_edge("analyze_commonalities", "generate_questions")
workflow.add_edge("generate_questions", "guardrails")
workflow.add_edge("guardrails", "parse_validate")
workflow.add_edge("parse_validate", END)

icebreaker_agent = workflow.compile()

class AgentService:
    """Handles vector embedding generation and LLM icebreaker questions."""

    @staticmethod
    def generate_embedding(text: str) -> list[float]:
        """
        Generate a 1536-dim normalized embedding for `text`.
        Priority: Hugging Face → deterministic hash fallback.
        """
        if not text:
            return [0.0] * 1536

        if settings.HF_ACCESS_TOKEN and settings.HF_MODEL:
            try:
                response = httpx.post(
                    f"https://router.huggingface.co/hf-inference/models/{settings.HF_MODEL}",
                    headers={"Authorization": f"Bearer {settings.HF_ACCESS_TOKEN}"},
                    json={"inputs": text},
                    timeout=10.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    while isinstance(data, list) and data and isinstance(data[0], list):
                        data = data[0]
                    if isinstance(data, list) and all(isinstance(x, (int, float)) for x in data):
                        return _normalize(_pad_or_truncate(list(data)))
                else:
                    print(f"[HF] status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"[HF] error: {e}. Falling back to hash embedding.")

        # 2. Deterministic hash-based fallback (no external calls)
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        vector = [((digest[i % 32] + i * 17) % 256 / 127.5) - 1.0 for i in range(1536)]
        return _normalize(vector)

    @staticmethod
    def extract_vibe_tags(free_text: Optional[str], religious_orientation: Optional[str] = None) -> List[str]:
        """Extract 3-4 Vibe Tags for a host's Shabbat table atmosphere."""
        tags = []
        text = (free_text or "") + " " + (religious_orientation or "")
        text_lower = text.lower()

        if any(k in text_lower for k in ["שיר", "זמירות", "נגינה", "גיטרה", "שמח", "תוסס", "שירים"]):
            tags.append("#שירים_ורקודים")
            tags.append("#שולחן_תוסס")
        if any(k in text_lower for k in ["שקט", "רגוע", "אינטימי", "עמוק", "שיחות", "סולידי"]):
            tags.append("#שקט_ורגוע")
            tags.append("#שיחות_עומק")
        if any(k in text_lower for k in ["עדתי", "תימני", "מרוקאי", "אשכנזי", "טעים", "בישול", "מאכלים", "אוכל"]):
            tags.append("#אוכל_עדתי")
        if any(k in text_lower for k in ["משפחה", "ילדים", "חם", "בית", "משפחתי"]):
            tags.append("#שולחן_משפחתי")
        if any(k in text_lower for k in ["צעיר", "חיילים", "סטודנטים", "חברים", "רווקים"]):
            tags.append("#צעירים_וחברים")

        # Fallbacks based on religious orientation or defaults
        if not tags:
            if "דתי" in text_lower or "חרדי" in text_lower:
                tags = ["#שולחן_חם", "#שיחות_עומק", "#שירים_ורקודים"]
            elif "חילוני" in text_lower or "מסורתי" in text_lower:
                tags = ["#אווירה_פתוחה", "#צעירים_וחברים", "#שיחות_עומק"]
            else:
                tags = ["#שולחן_חם", "#אוכל_עדתי", "#שיחות_עומק"]

        return list(dict.fromkeys(tags))[:4]


    @staticmethod
    def generate_icebreakers(host_attributes: dict, guest_attributes: dict, user_role: str = "host") -> list[str]:
        """Return 3 personalized icebreaker questions for a host-guest pair using LangGraph."""
        input_state = {
            "role_perspective": user_role if user_role in ["host", "guest"] else "host",
            "host_city": host_attributes.get("city") or "Unknown",
            "host_kashrut": str(host_attributes.get("kashrut_level") or "Unknown"),
            "host_religious": host_attributes.get("religious_orientation") or "Unknown",
            "host_free_text": host_attributes.get("free_text_notes") or "None",
            "guest_status": "Soldier/National Service" if guest_attributes.get("is_soldier") else "Regular Guest",
            "guest_dietary": guest_attributes.get("food_preferences_allergies") or "None",
            "guest_preference": guest_attributes.get("description") or "None",
            "guest_skills": guest_attributes.get("skills_give_take") or "None",
            "commonalities": "",
            "raw_questions": "",
            "checked_questions": "",
            "icebreakers": []
        }
        
        try:
            result = icebreaker_agent.invoke(input_state)
            return result.get("icebreakers") or get_default_icebreakers(user_role)
        except Exception as e:
            print(f"[AgentService] error running LangGraph: {e}")
            return get_default_icebreakers(user_role)

