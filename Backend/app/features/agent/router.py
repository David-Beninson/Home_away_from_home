import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.database.session import get_db
from app.database.models.user import User, UserType
from app.database.models.match import Match
from app.database.models.message import Message
from app.features.auth.services import get_active_user
from app.features.chat.router import _verify_match_access
from app.agent.services import AgentService
from app.agent.prompts import get_default_icebreakers

router = APIRouter(prefix="/agent", tags=["agent"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class SuggestReplyRequest(BaseModel):
    match_id: Optional[uuid.UUID] = None
    chat_id: Optional[uuid.UUID] = None

class SuggestReplyResponse(BaseModel):
    suggestions: List[str]

@router.post("/chat", response_model=ChatResponse)
def agent_chat(payload: ChatRequest):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")
    
    reply = AgentService.chat(payload.message)
    return ChatResponse(response=reply)

@router.post("/suggest-reply", response_model=SuggestReplyResponse)
def suggest_reply(
    payload: SuggestReplyRequest,
    current_user: User = Depends(get_active_user),
    db: Session = Depends(get_db)
):
    match_id = payload.match_id or payload.chat_id
    current_role_str = "Host" if current_user.user_type == UserType.HOST else "Guest"
    
    if not match_id:
        default_replies = get_default_icebreakers(current_role_str.lower())
        return SuggestReplyResponse(suggestions=default_replies)

    match = db.query(Match).options(
        joinedload(Match.guest_post),
        joinedload(Match.host_profile)
    ).filter(Match.id == match_id).first()

    if not match or not _verify_match_access(current_user, match):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this chat context")

    # Fetch recent message history chronologically
    messages = db.query(Message).filter(Message.match_id == match_id).order_by(Message.created_at.asc()).all()

    host_prof = match.host_profile
    guest_post = match.guest_post
    guest_prof = guest_post.guest_profile if guest_post else None

    host_user = host_prof.user if host_prof else None
    guest_user = guest_prof.user if guest_prof else None

    host_user_id = host_prof.user_id if host_prof else (host_user.id if host_user else None)
    guest_user_id = guest_prof.user_id if guest_prof else (guest_user.id if guest_user else None)

    # Determine current user's role in this specific match
    if host_user_id and current_user.id == host_user_id:
        current_role_str = "HOST"
        other_role_str = "GUEST"
    elif guest_user_id and current_user.id == guest_user_id:
        current_role_str = "GUEST"
        other_role_str = "HOST"
    else:
        current_role_str = "HOST" if current_user.user_type == UserType.HOST else "GUEST"
        other_role_str = "GUEST" if current_role_str == "HOST" else "HOST"

    is_guest_anon = False
    if guest_post:
        is_guest_anon = getattr(guest_post, 'is_anonymous', False) or guest_post.guest_name in ['Soldier', 'Anonymous Guest', 'אנונימי', 'חייל אנונימי', 'אורח אנונימי']

    host_name = (host_user.full_name if host_user else None) or "Host"
    guest_name = "Guest" if is_guest_anon else ((guest_user.full_name if guest_user else None) or (guest_post.guest_name if guest_post else "Guest"))

    current_user_name = host_name if current_role_str == "HOST" else guest_name
    other_party_name = guest_name if current_role_str == "HOST" else host_name

    if not messages:
        # Fallback to icebreaker recommendations if thread is empty
        host_info = {
            "city": getattr(match.host_profile, 'city', None) if match.host_profile else None,
            "kashrut_level": getattr(match.host_profile, 'kashrut_level', None) if match.host_profile else None,
            "neighborhood_type": getattr(match.host_profile, 'neighborhood_type', None) if match.host_profile else None,
            "vibe_tags": getattr(match.host_profile, 'vibe_tags', None) if match.host_profile else None,
        }
        food_pref = getattr(guest_prof, 'food_preferences', None) if guest_prof else None
        food_all = getattr(guest_prof, 'food_allergies', None) if guest_prof else None
        combined_food = " ".join(filter(None, [food_pref, food_all])) or None
        guest_info = {
            "is_soldier": getattr(guest_prof, 'is_soldier_or_national_service', False) if guest_prof else False,
            "description": getattr(guest_post, 'description', "") if guest_post else "",
            "food_preferences_allergies": combined_food,
            "skills_give_take": getattr(guest_prof, 'unit_description', None) if guest_prof else None
        }
        icebreakers = AgentService.generate_icebreakers(host_info, guest_info, user_role=current_role_str.lower())
        return SuggestReplyResponse(suggestions=icebreakers)

    # Format chronological message context clearly as [Host] or [Guest]
    formatted_lines = []
    for msg in messages:
        if host_user_id and msg.sender_id == host_user_id:
            sender_label = f"Host ({host_name})"
        elif guest_user_id and msg.sender_id == guest_user_id:
            sender_label = f"Guest ({guest_name})"
        elif msg.sender_id == current_user.id:
            sender_label = f"{current_role_str.capitalize()} ({current_user_name})"
        else:
            sender_label = f"{other_role_str.capitalize()} ({other_party_name})"

        formatted_lines.append(f"[{sender_label}]: {msg.content}")

    chat_history_str = "\n".join(formatted_lines)

    suggestions = AgentService.suggest_chat_reply(
        chat_history=chat_history_str,
        current_role=current_role_str,
        current_user_name=current_user_name,
        other_role=other_role_str,
        other_party_name=other_party_name
    )

    return SuggestReplyResponse(suggestions=suggestions)
