import uuid
import jwt
import asyncio
from typing import List, Dict, Tuple
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session, joinedload
from app.core.config import settings
from app.database.session import get_db, SessionLocal
from app.database.models.user import User, UserType
from app.database.models.match import Match
from app.database.models.message import Message
from app.database.models.post import GuestPost
from app.features.auth.services import get_current_user
from app.features.chat.schemas import MessageResponse, ChatPreviewResponse, ChatReadRequest

router = APIRouter(prefix="", tags=["In-App Chat"])

class ConnectionManager:
    """Manages active WebSocket connections grouped by match (booking) ID.
    Each entry stores (websocket, user_id) tuples so we can skip sending
    messages back to the original sender.
    """
    def __init__(self):
        self.active_connections: Dict[uuid.UUID, List[Tuple[WebSocket, uuid.UUID]]] = defaultdict(list)

    async def connect(self, match_id: uuid.UUID, websocket: WebSocket, user_id: uuid.UUID):
        await websocket.accept()
        self.active_connections[match_id].append((websocket, user_id))

    def disconnect(self, match_id: uuid.UUID, websocket: WebSocket):
        if match_id in self.active_connections:
            self.active_connections[match_id] = [
                (ws, uid) for ws, uid in self.active_connections[match_id] if ws is not websocket
            ]
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]

    async def broadcast(self, match_id: uuid.UUID, message_data: dict, sender_id: uuid.UUID):
        """Broadcast to all participants EXCEPT the sender (sender already sees it locally)."""
        for ws, uid in list(self.active_connections.get(match_id, [])):
            if uid == sender_id:
                continue  # skip echo to sender
            try:
                await ws.send_json(message_data)
            except Exception as e:
                print(f"[WebSocket Broadcast Error] Match {match_id}, user {uid}: {e}")
                self.disconnect(match_id, ws)

manager = ConnectionManager()


def _verify_match_access(user: User, match: Match) -> bool:
    """Verify if the user is authorized to participate in this match's chat."""
    if user.user_type == UserType.ADMIN:
        return True
    
    is_host = (
        user.user_type == UserType.HOST and 
        user.host_profile and 
        match.host_profile_id == user.host_profile.id
    )
    is_guest = (
        user.user_type == UserType.GUEST and 
        user.guest_profile and 
        match.guest_post and match.guest_post.guest_profile_id == user.guest_profile.id
    )
    return bool(is_host or is_guest)


@router.get("/matches/{match_id}/messages", response_model=List[MessageResponse])
def get_message_history(match_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve message history for a specific match, sorted chronologically."""
    match = db.query(Match).options(joinedload(Match.guest_post)).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    if not _verify_match_access(current_user, match):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this chat")

    return db.query(Message).filter(Message.match_id == match_id).order_by(Message.created_at.asc()).all()


@router.get("/my-chats", response_model=List[ChatPreviewResponse])
def get_my_chats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve all active chats for the current user."""
    from sqlalchemy import desc
    from app.database.models.match import MatchStatus
    from app.database.models.profile import HostProfile, GuestProfile

    chats = []
    
    if current_user.user_type == UserType.HOST and current_user.host_profile:
        matches = db.query(Match).join(GuestPost).join(GuestProfile).filter(
            Match.host_profile_id == current_user.host_profile.id,
            Match.status.in_([MatchStatus.MATCHED, MatchStatus.PENDING])
        ).all()
        for match in matches:
            last_message = db.query(Message).filter(Message.match_id == match.id).order_by(desc(Message.created_at)).first()
            unread_count = db.query(Message).filter(Message.match_id == match.id, Message.sender_id != current_user.id, Message.is_read == False).count()
            guest_post = match.guest_post
            guest_prof = guest_post.guest_profile if guest_post else None
            is_anon = False
            if guest_post:
                is_anon = getattr(guest_post, 'is_anonymous', False) or guest_post.guest_name in ['Soldier', 'Anonymous Guest', 'אנונימי', 'חייל אנונימי', 'אורח אנונימי']
            
            if is_anon:
                other_name = 'אנונימי'
                other_phone = None
            else:
                other_name = (guest_prof.user.full_name if (guest_prof and guest_prof.user) else None) or (guest_post.guest_name if guest_post else None) or "אורח"
                other_phone = guest_prof.user.phone_number if (guest_prof and guest_prof.user) else None

            hosting_date = (guest_post.start_date or guest_post.requested_date) if guest_post else None
            if hosting_date is None:
                continue  # skip matches without a valid date
            chats.append(ChatPreviewResponse(
                match_id=match.id,
                other_party_name=other_name,
                other_party_avatar=None,
                other_party_phone=other_phone,
                phone_number=other_phone,
                hosting_date=hosting_date,
                last_message=last_message.content if last_message else None,
                last_message_time=last_message.created_at if last_message else None,
                unread_count=unread_count
            ))

    elif current_user.user_type == UserType.GUEST and current_user.guest_profile:
        matches = db.query(Match).join(GuestPost).join(HostProfile, Match.host_profile_id == HostProfile.id).filter(
            GuestPost.guest_profile_id == current_user.guest_profile.id,
            Match.status.in_([MatchStatus.MATCHED, MatchStatus.PENDING])
        ).all()
        for match in matches:
            last_message = db.query(Message).filter(Message.match_id == match.id).order_by(desc(Message.created_at)).first()
            unread_count = db.query(Message).filter(Message.match_id == match.id, Message.sender_id != current_user.id, Message.is_read == False).count()
            host_prof = match.host_profile
            other_name = (host_prof.user.full_name if (host_prof and host_prof.user) else None) or "מארח"
            other_phone = host_prof.user.phone_number if (host_prof and host_prof.user) else None
            hosting_date = (match.guest_post.start_date or match.guest_post.requested_date) if match.guest_post else None
            if hosting_date is None:
                continue
            chats.append(ChatPreviewResponse(
                match_id=match.id,
                other_party_name=other_name,
                other_party_avatar=None,
                other_party_phone=other_phone,
                phone_number=other_phone,
                hosting_date=hosting_date,
                last_message=last_message.content if last_message else None,
                last_message_time=last_message.created_at if last_message else None,
                unread_count=unread_count
            ))

    # sort by last message time
    chats.sort(key=lambda x: x.last_message_time.timestamp() if x.last_message_time else 0, reverse=True)
    return chats


@router.post("/matches/{match_id}/chat/read", status_code=status.HTTP_200_OK)
def mark_chat_read(match_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark all unread messages in a chat as read by the current user."""
    match = db.query(Match).options(joinedload(Match.guest_post)).filter(Match.id == match_id).first()
    if not match or not _verify_match_access(current_user, match):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    unread_msgs = db.query(Message).filter(
        Message.match_id == match_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).all()
    
    for msg in unread_msgs:
        msg.is_read = True
    db.commit()
    
    return {"status": "success", "marked_read": len(unread_msgs)}

@router.websocket("/matches/{match_id}/chat/ws")
async def websocket_chat_endpoint(websocket: WebSocket, match_id: uuid.UUID, token: str = Query(...)):
    """WebSocket endpoint for real-time messaging between host and guest."""
    # Must accept BEFORE any close — ASGI state machine requires accept first
    await websocket.accept()

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=4001, reason="Invalid token payload")
            return
        user_uuid = uuid.UUID(user_id_str)
    except Exception:
        await websocket.close(code=4001, reason="Could not validate credentials")
        return

    def _auth_check():
        with SessionLocal() as db:
            u = db.query(User).filter(User.id == user_uuid).first()
            m = db.query(Match).options(joinedload(Match.guest_post)).filter(Match.id == match_id).first()
            if not u or not m:
                return None, None, None
            access = _verify_match_access(u, m)
            return u.id if access else None, m, u

    user_id, match, _user = await asyncio.to_thread(_auth_check)

    if user_id is None:
        await websocket.close(code=4003, reason="Not authorized or not found")
        return

    # Already accepted above — just register in manager without calling accept() again
    manager.active_connections[match_id].append((websocket, user_id))
    try:
        while True:
            data = await websocket.receive_text()
            data = data.strip()
            if not data:
                continue

            # Handle heartbeat ping — respond immediately, no DB needed
            try:
                import json as _json
                parsed = _json.loads(data)
                if isinstance(parsed, dict) and parsed.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue
            except Exception:
                pass  # not JSON, treat as plain text message

            # Save message AND resolve notification recipient in ONE DB session,
            # offloaded to a thread so the event loop is never blocked.
            def _save_and_resolve():
                with SessionLocal() as db:
                    new_msg = Message(match_id=match_id, sender_id=user_id, content=data)
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)
                    msg_dict = MessageResponse.model_validate(new_msg).model_dump(mode="json")

                    # Resolve recipient in the same session
                    match_obj = db.query(Match).options(
                        joinedload(Match.guest_post)
                    ).filter(Match.id == match_id).first()
                    sender_obj = db.query(User).filter(User.id == user_id).first()
                    sender_name = sender_obj.full_name if sender_obj else "משתמש"

                    recipient_id = None
                    if match_obj:
                        if match_obj.host_profile and match_obj.host_profile.user_id == user_id:
                            if match_obj.guest_post and match_obj.guest_post.guest_profile:
                                recipient_id = match_obj.guest_post.guest_profile.user_id
                        else:
                            if match_obj.host_profile:
                                recipient_id = match_obj.host_profile.user_id

                    return msg_dict, sender_name, recipient_id

            msg_payload, sender_name, recipient_id = await asyncio.to_thread(_save_and_resolve)

            # Broadcast to other participants (non-blocking, pure async)
            await manager.broadcast(match_id, msg_payload, sender_id=user_id)

            # Fire-and-forget notification — never slow down the main message loop
            if recipient_id:
                try:
                    from app.features.notifications.router import manager as notification_manager
                    asyncio.create_task(notification_manager.send_personal_notification({
                        "id": str(uuid.uuid4()),
                        "title": f"הודעה חדשה מ{sender_name}",
                        "message": data[:60] + ("..." if len(data) > 60 else ""),
                        "type": "message",
                        "time": "עכשיו",
                        "isRead": False
                    }, str(recipient_id)))
                except Exception as e:
                    print(f"Failed to trigger chat notification: {e}")
    except WebSocketDisconnect:
        manager.disconnect(match_id, websocket)
    except Exception as e:
        print(f"[WebSocket Error] Match {match_id}: {e}")
        manager.disconnect(match_id, websocket)
