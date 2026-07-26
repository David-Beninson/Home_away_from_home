import uuid
from sqlalchemy import select
import jwt
import asyncio
from typing import List, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db, SessionLocal
from app.database.models.user import User, UserType
from app.database.models.post import GuestPost, PostStatus
from app.database.models.match import Match, MatchStatus
from app.features.auth.services import get_current_user
from app.features.posts.schemas import GuestPostCreate, GuestPostUpdate, GuestPostResponse
from app.features.notifications.router import manager as notification_manager


router = APIRouter(prefix="/posts", tags=["Guest Posts"])

class PostConnectionManager:
    """Manages active WebSocket connections for posts feeds, grouped by user ID and type."""
    def __init__(self):
        # We store connections as a list of dicts: {"websocket": ws, "user_id": uid, "user_type": utype}
        self.active_connections = []

    async def connect(self, websocket: WebSocket, user_id: uuid.UUID, user_type: UserType):
        await websocket.accept()
        self.active_connections.append({
            "websocket": websocket,
            "user_id": user_id,
            "user_type": user_type
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [
            conn for conn in self.active_connections if conn["websocket"] != websocket
        ]

    async def broadcast_updates(self):
        """Recalculate and send updates to all active clients according to their role."""
        with SessionLocal() as db:
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            for conn in list(self.active_connections):
                try:
                    if conn["user_type"] == UserType.HOST:
                        host_user = db.query(User).filter(User.id == conn["user_id"]).first()
                        host_profile_id = host_user.host_profile.id if (host_user and host_user.host_profile) else None
                        
                        if host_profile_id:
                            rejected_select = select(Match.guest_post_id).where(
                                Match.host_profile_id == host_profile_id,
                                Match.status == MatchStatus.REJECTED
                            )

                            posts = db.query(GuestPost).filter(
                                GuestPost.requested_date >= today_start,
                                ~GuestPost.id.in_(rejected_select),
                                (
                                    (GuestPost.status == PostStatus.OPEN) | 
                                    ((GuestPost.status.in_([PostStatus.PENDING, PostStatus.MATCHED])) & (GuestPost.claimed_by_host_id == host_profile_id))
                                )
                            ).all()
                        else:
                            posts = db.query(GuestPost).filter(
                                GuestPost.status == PostStatus.OPEN,
                                GuestPost.requested_date >= today_start
                            ).all()
                        posts.sort(key=lambda p: (not p.is_urgent, p.requested_date))
                        posts_data = [GuestPostResponse.model_validate(p).model_dump(mode="json") for p in posts]
                        await conn["websocket"].send_json(posts_data)
                    elif conn["user_type"] == UserType.GUEST:
                        # Guests get their own posts
                        guest_posts = db.query(GuestPost).join(GuestPost.guest_profile).filter(
                            GuestPost.guest_profile.has(user_id=conn["user_id"])
                        ).order_by(GuestPost.created_at.desc()).all()
                        guest_posts_data = [GuestPostResponse.model_validate(p).model_dump(mode="json") for p in guest_posts]
                        await conn["websocket"].send_json(guest_posts_data)
                except Exception as e:
                    print(f"[WebSocket Broadcast Error] Failed sending update to user {conn['user_id']}: {e}")

    async def broadcast_event(self, event_data: dict):
        """Send a custom JSON event payload to all active clients."""
        for conn in list(self.active_connections):
            try:
                await conn["websocket"].send_json(event_data)
            except Exception as e:
                print(f"[WebSocket Event Broadcast Error] Failed sending to user {conn['user_id']}: {e}")

post_manager = PostConnectionManager()

@router.post("", response_model=GuestPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: GuestPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.GUEST or not current_user.guest_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only guests with profiles can create posts"
        )
        
    req_date = post_in.start_date or post_in.requested_date
    new_post = GuestPost(
        guest_profile_id=current_user.guest_profile.id,
        requested_date=req_date,
        start_date=req_date,
        end_date=post_in.end_date,
        nights_count=post_in.nights_count,
        description=post_in.description,
        guests_count=post_in.guests_count,
        is_anonymous=post_in.is_anonymous if post_in.is_anonymous is not None else True,
        status=PostStatus.OPEN
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    # Broadcast live updates to active WebSockets directly
    await post_manager.broadcast_updates()
    
    return new_post

@router.get("", response_model=List[GuestPostResponse])
def get_posts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type == UserType.HOST:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        host_profile_id = current_user.host_profile.id if current_user.host_profile else None
        
        if host_profile_id:
            rejected_select = select(Match.guest_post_id).where(
                Match.host_profile_id == host_profile_id,
                Match.status == MatchStatus.REJECTED
            )

            posts = db.query(GuestPost).filter(
                GuestPost.requested_date >= today_start,
                ~GuestPost.id.in_(rejected_select),
                (
                    (GuestPost.status == PostStatus.OPEN) | 
                    ((GuestPost.status.in_([PostStatus.PENDING, PostStatus.MATCHED])) & (GuestPost.claimed_by_host_id == host_profile_id))
                )
            ).all()
        else:
            posts = db.query(GuestPost).filter(
                GuestPost.status == PostStatus.OPEN,
                GuestPost.requested_date >= today_start
            ).all()
            
        posts.sort(key=lambda p: (not p.is_urgent, p.requested_date))
        return posts
    elif current_user.user_type == UserType.GUEST:
        if not current_user.guest_profile:
            return []
        posts = db.query(GuestPost).filter(
            GuestPost.guest_profile_id == current_user.guest_profile.id
        ).order_by(GuestPost.created_at.desc()).all()
        return posts
    else:
        posts = db.query(GuestPost).filter(GuestPost.status == PostStatus.OPEN).all()
        posts.sort(key=lambda p: (not p.is_urgent, p.requested_date))
        return posts

@router.put("/{post_id}", response_model=GuestPostResponse)
async def update_post(
    post_id: uuid.UUID,
    post_in: GuestPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.GUEST or not current_user.guest_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only guests with profiles can edit posts"
        )

    post = db.query(GuestPost).filter(GuestPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest post not found"
        )

    if post.guest_profile_id != current_user.guest_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts"
        )

    update_data = post_in.model_dump(exclude_unset=True)
    if "requested_date" in update_data and update_data["requested_date"] and "start_date" not in update_data:
        update_data["start_date"] = update_data["requested_date"]

    for field, value in update_data.items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)

    await post_manager.broadcast_updates()
    return post


@router.post("/{post_id}/claim")
async def claim_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.HOST or not current_user.host_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only hosts with profiles can claim guest posts"
        )
        
    post = db.query(GuestPost).filter(GuestPost.id == post_id).with_for_update().first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest post not found"
        )
        
    if post.status == PostStatus.MATCHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest post is already claimed"
        )
        
    post.status = PostStatus.PENDING
    post.claimed_by_host_id = current_user.host_profile.id
    
    match = Match(
        guest_post_id=post.id,
        host_profile_id=current_user.host_profile.id,
        status=MatchStatus.PENDING
    )
    db.add(match)
    db.commit()
    db.refresh(post) # Refresh so we can access relations like guest_profile
    
    # 1. Broadcast live updates to active posts WebSockets (updates the board)
    await post_manager.broadcast_updates()
    
    # 2. PUSH LIVE NOTIFICATION to the guest's notification bell!
    if post.guest_profile and post.guest_profile.user_id:
        guest_user_id_str = str(post.guest_profile.user_id)
        
        notification_payload = {
            "id": str(uuid.uuid4()),
            "type": "alert",
            "title": "הצעת אירוח חדשה!",
            "message": f"המארח {current_user.full_name or ''} הציע לארח אותך לשבת! לחץ לאישור או דחייה.",
            "time": "עכשיו",
            "isRead": False
        }
        
        await notification_manager.send_personal_notification(notification_payload, guest_user_id_str)
    
    return {
        "message": "Guest post claimed successfully",
        "match_id": str(match.id),
        "post_status": post.status
    }

@router.websocket("/ws")
async def websocket_posts_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time posts feed subscription based on user role."""
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

    def _auth_query():
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.id == user_uuid).first()
            if not u:
                return None, None
            return u.id, u.user_type
        finally:
            db.close()

    user_id, user_type = await asyncio.to_thread(_auth_query)
    if user_id is None:
        await websocket.close(code=4001, reason="User not found")
        return

    await post_manager.connect(websocket, user_id, user_type)
    
    try:
        # Send initial list in a thread — sync DB must not block event loop
        def _fetch_initial_posts():
            db = SessionLocal()
            try:
                if user_type == UserType.HOST:
                    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                    current_user = db.query(User).filter(User.id == user_id).first()
                    host_profile_id = current_user.host_profile.id if (current_user and current_user.host_profile) else None
                    if host_profile_id:
                        rejected_select = select(Match.guest_post_id).where(
                            Match.host_profile_id == host_profile_id,
                            Match.status == MatchStatus.REJECTED
                        )
                        posts = db.query(GuestPost).filter(
                            GuestPost.requested_date >= today_start,
                            ~GuestPost.id.in_(rejected_select),
                            (
                                (GuestPost.status == PostStatus.OPEN) |
                                ((GuestPost.status.in_([PostStatus.PENDING, PostStatus.MATCHED])) & (GuestPost.claimed_by_host_id == host_profile_id))
                            )
                        ).all()
                    else:
                        posts = db.query(GuestPost).filter(
                            GuestPost.status == PostStatus.OPEN,
                            GuestPost.requested_date >= today_start
                        ).all()
                    posts.sort(key=lambda p: (not p.is_urgent, p.requested_date))
                    return [GuestPostResponse.model_validate(p).model_dump(mode="json") for p in posts]
                elif user_type == UserType.GUEST:
                    posts = db.query(GuestPost).join(GuestPost.guest_profile).filter(
                        GuestPost.guest_profile.has(user_id=user_id)
                    ).order_by(GuestPost.created_at.desc()).all()
                    return [GuestPostResponse.model_validate(p).model_dump(mode="json") for p in posts]
                return []
            finally:
                db.close()

        posts_data = await asyncio.to_thread(_fetch_initial_posts)
        await websocket.send_json(posts_data)

        while True:
            # Keep connection alive and handle heartbeat pings
            raw = await websocket.receive_text()
            try:
                import json as _json
                parsed = _json.loads(raw)
                if isinstance(parsed, dict) and parsed.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        post_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket Disconnect Error] {e}")
        post_manager.disconnect(websocket)


