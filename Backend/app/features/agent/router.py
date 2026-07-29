from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agent.services import AgentService

router = APIRouter(prefix="/agent", tags=["agent"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
def agent_chat(payload: ChatRequest):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    reply = AgentService.chat(payload.message)
    return ChatResponse(response=reply)
