import json
import uuid
from datetime import datetime, timezone
from collections import defaultdict
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.database.session import get_db, SessionLocal
from app.database.models.notification import Notification
from app.database.models.user import User
from app.features.auth.router import get_current_user

router = APIRouter(tags=["notifications"])

class ConnectionManager:
    def __init__(self):
        # Stores active connections: { user_id: [websocket_object, ...] }
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        user_key = str(user_id)
        self.active_connections[user_key].append(websocket)
        print(f"User {user_key} connected to notifications (Active tabs: {len(self.active_connections[user_key])}).")

    def disconnect(self, websocket: WebSocket, user_id: str):
        user_key = str(user_id)
        if user_key in self.active_connections:
            if websocket in self.active_connections[user_key]:
                self.active_connections[user_key].remove(websocket)
            if not self.active_connections[user_key]:
                del self.active_connections[user_key]
            print(f"User {user_key} socket disconnected.")

    async def send_personal_notification(self, message: dict, user_id: str, db: Optional[Session] = None):
        user_key = str(user_id)
        
        # 1. Guarantee persistence to DB for offline & online tracking
        if isinstance(message, dict):
            try:
                local_db = db or SessionLocal()
                should_close = db is None
                try:
                    notif_id = message.get("id")
                    existing = None
                    if notif_id:
                        try:
                            existing = local_db.query(Notification).filter(Notification.id == uuid.UUID(str(notif_id))).first()
                        except Exception:
                            existing = None

                    if not existing:
                        new_uuid = uuid.UUID(str(notif_id)) if (notif_id and len(str(notif_id)) == 36) else uuid.uuid4()
                        db_notif = Notification(
                            id=new_uuid,
                            user_id=uuid.UUID(user_key),
                            type=message.get("type", "default"),
                            title=message.get("title", "התראה"),
                            message=message.get("message", ""),
                            is_read=message.get("isRead", False) or message.get("is_read", False),
                            link=message.get("link") or message.get("path"),
                            payload=message
                        )
                        local_db.add(db_notif)
                        local_db.commit()
                        local_db.refresh(db_notif)
                        
                        message["id"] = str(db_notif.id)
                        message["created_at"] = db_notif.created_at.isoformat() if db_notif.created_at else ""
                        message["isRead"] = db_notif.is_read
                        message["is_read"] = db_notif.is_read
                        message["time"] = db_notif.created_at.strftime("%H:%M") if db_notif.created_at else "עכשיו"
                finally:
                    if should_close:
                        local_db.close()
            except Exception as e:
                print(f"Warning: Exception while persisting notification to DB: {e}")

        # 2. Broadcast live WebSocket message if recipient is connected
        if user_key in self.active_connections:
            dead_sockets = []
            for ws in list(self.active_connections[user_key]):
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"Failed to send notification to user {user_key}: {e}")
                    dead_sockets.append(ws)
            
            for ws in dead_sockets:
                self.disconnect(ws, user_key)


# Global instance to be imported by other features (bookings, chat, etc.)
manager = ConnectionManager()


@router.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data:
                try:
                    parsed = json.loads(data)
                    if parsed.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"Unexpected error in notification socket for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)


@router.get("/notifications")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all notifications for the authenticated user, sorted by recency."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    
    result = []
    for n in notifications:
        result.append({
            "id": str(n.id),
            "user_id": str(n.user_id),
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "link": n.link,
            "payload": n.payload or {},
            "isRead": n.is_read,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else "",
            "time": n.created_at.strftime("%d/%m %H:%M") if n.created_at else ""
        })
    return result


@router.patch("/notifications/read-all")
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


@router.patch("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read."""
    try:
        n_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification ID format")

    notification = (
        db.query(Notification)
        .filter(Notification.id == n_uuid, Notification.user_id == current_user.id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "id": notification_id}


@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a specific notification upon user request."""
    try:
        n_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification ID format")

    notification = (
        db.query(Notification)
        .filter(Notification.id == n_uuid, Notification.user_id == current_user.id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted", "id": notification_id}