from typing import Optional, List, Dict, Tuple
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.verification import VerificationType
from app.features.auth.services import get_current_user
from app.features.verification.schemas import (
    VerificationSubmitResponse,
    VerificationStatusResponse,
)
from app.features.verification.service import (
    verify_documents_mock,
    get_user_verification_status,
    get_secure_file_response,
)

router = APIRouter(prefix="/verification", tags=["Verification"])

@router.get("/files/{filename}")
def serve_protected_verification_file(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Secure endpoint for viewing uploaded selfies/IDs directly from PostgreSQL database."""
    return get_secure_file_response(filename, current_user, db)

@router.post("/submit", response_model=VerificationSubmitResponse)
async def submit_verification_documents(
    verification_type: VerificationType = Form(VerificationType.CIVILIAN),
    selfie: UploadFile = File(...),
    document: UploadFile = File(...),
    secondary_document: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits selfie & identity documents for verification.
    Executes mock AI scanning (3s delay) and puts request into PENDING_ADMIN queue.
    """
    if not selfie.content_type or not selfie.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selfie must be an image file."
        )

    if not document.content_type or not document.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document must be an image file."
        )

    if verification_type == VerificationType.LONE_SOLDIER:
        if not secondary_document or not secondary_document.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="חובה להעלות תעודת בודד או עולה חדש."
            )
        if not secondary_document.content_type or not secondary_document.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="תעודת בודד או עולה חדש חייבת להיות קובץ תמונה."
            )

    req = await verify_documents_mock(
        db=db,
        user=current_user,
        selfie_file=selfie,
        document_file=document,
        verification_type=verification_type,
        secondary_document_file=secondary_document
    )

    return VerificationSubmitResponse(
        message="Documents uploaded and scanned by AI. Sent for admin final approval.",
        request_id=req.id,
        status=req.status,
        user_verification_status=current_user.verification_status,
        ai_confidence_score=req.ai_confidence_score or 85.0
    )

@router.get("/status", response_model=VerificationStatusResponse)
def get_current_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the verification status and details for the logged-in user."""
    user_status, req = get_user_verification_status(db, current_user)
    return VerificationStatusResponse(
        user_verification_status=user_status,
        request_id=req.id if req else None,
        verification_type=req.verification_type if req else None,
        status=req.status if req else None,
        ai_confidence_score=req.ai_confidence_score if req else None,
        rejection_reason=req.rejection_reason if req else None,
        updated_at=req.updated_at if req else None,
    )


# --- Support Messages Endpoints & Real-time WebSocket ---
import json
from typing import List, Optional, Dict, Tuple
from collections import defaultdict
import uuid
import asyncio
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Query
from app.core.config import settings
import jwt
from app.database.models.support_message import SupportMessage
from app.database.models.user import UserType
from app.features.verification.schemas import SupportMessageCreate, SupportMessageResponse
from app.features.notifications.router import manager

class SupportConnectionManager:
    """Manages active WebSocket connections for support chat threads grouped by target user_id."""
    def __init__(self):
        # { user_id_str: [ (websocket, sender_id_str), ... ] }
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = defaultdict(list)

    async def connect(self, user_id_str: str, websocket: WebSocket, sender_id_str: str):
        await websocket.accept()
        self.active_connections[user_id_str].append((websocket, sender_id_str))

    def disconnect(self, user_id_str: str, websocket: WebSocket):
        if user_id_str in self.active_connections:
            self.active_connections[user_id_str] = [
                (ws, sid) for ws, sid in self.active_connections[user_id_str] if ws is not websocket
            ]
            if not self.active_connections[user_id_str]:
                del self.active_connections[user_id_str]

    async def broadcast(self, user_id_str: str, message_data: dict, sender_id_str: str = ""):
        """Broadcast support message to all active connections in thread."""
        for ws, sid in list(self.active_connections.get(user_id_str, [])):
            try:
                await ws.send_json(message_data)
            except Exception:
                pass

support_ws_manager = SupportConnectionManager()

@router.websocket("/ws/support/{target_user_id}")
async def support_chat_websocket(
    websocket: WebSocket,
    target_user_id: str,
    token: Optional[str] = Query(None)
):
    """Real-time WebSocket for support chat between user and admin."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sender_id = payload.get("sub")
        if not sender_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = str(target_user_id)
    sender_id_str = str(sender_id)

    await support_ws_manager.connect(user_id_str, websocket, sender_id_str)
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
        support_ws_manager.disconnect(user_id_str, websocket)
    except Exception:
        support_ws_manager.disconnect(user_id_str, websocket)

@router.get("/support-messages", response_model=List[SupportMessageResponse])
def get_support_messages(
    target_user_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches support chat messages for user or admin."""
    effective_user_id = current_user.id
    if current_user.user_type == UserType.ADMIN and target_user_id:
        effective_user_id = target_user_id

    messages = db.query(SupportMessage).filter(
        SupportMessage.user_id == effective_user_id
    ).order_by(SupportMessage.created_at.asc()).all()

    res = []
    for msg in messages:
        sender_name = "הנהלת המערכת" if msg.sender_id != effective_user_id else (msg.sender.full_name if msg.sender else "משתמש")
        res.append(
            SupportMessageResponse(
                id=msg.id,
                user_id=msg.user_id,
                sender_id=msg.sender_id,
                sender_name=sender_name,
                content=msg.content,
                created_at=msg.created_at,
            )
        )
    return res

@router.post("/support-messages", response_model=SupportMessageResponse)
async def send_support_message(
    payload: SupportMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sends a message to the admin support chat thread."""
    effective_user_id = current_user.id
    if current_user.user_type == UserType.ADMIN and payload.target_user_id:
        effective_user_id = payload.target_user_id

    msg = SupportMessage(
        user_id=effective_user_id,
        sender_id=current_user.id,
        content=payload.content.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    sender_name = "הנהלת המערכת" if current_user.user_type == UserType.ADMIN else current_user.full_name

    # Build the WS payload once
    ws_payload = {
        "id": str(msg.id),
        "user_id": str(msg.user_id),
        "sender_id": str(msg.sender_id),
        "sender_name": sender_name,
        "content": msg.content,
        "created_at": msg.created_at.isoformat()
    }

    # Broadcast via Support WebSocket (now safe — we're in async context)
    try:
        asyncio.create_task(support_ws_manager.broadcast(str(effective_user_id), ws_payload, str(current_user.id)))
    except Exception as e:
        print(f"Failed to broadcast support ws message: {e}")

    # Live bell notification for recipient
    try:
        if current_user.user_type == UserType.ADMIN:
            asyncio.create_task(
                manager.send_personal_notification(
                    {
                        "id": f"supp_{msg.id}",
                        "title": "הודעה חדשה מהנהלת המערכת 💬",
                        "message": payload.content.strip(),
                        "type": "message",
                        "time": datetime.now().strftime("%H:%M")
                    },
                    str(effective_user_id)
                )
            )
        else:
            admin_users = db.query(User).filter(User.user_type == UserType.ADMIN).all()
            for admin in admin_users:
                asyncio.create_task(
                    manager.send_personal_notification(
                        {
                            "id": f"supp_{msg.id}",
                            "title": f"הודעת תמיכה מ-{current_user.full_name} 💬",
                            "message": payload.content.strip(),
                            "type": "message",
                            "time": datetime.now().strftime("%H:%M")
                        },
                        str(admin.id)
                    )
                )
    except Exception as e:
        print(f"Failed to dispatch live support message notification: {e}")

    return SupportMessageResponse(
        id=msg.id,
        user_id=msg.user_id,
        sender_id=msg.sender_id,
        sender_name=sender_name,
        content=msg.content,
        created_at=msg.created_at,
    )
