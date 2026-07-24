import uuid
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, Integer

from app.database.models.user import User, UserType
from app.database.models.post import GuestPost, PostStatus
from app.database.models.match import Match, MatchStatus
from app.database.models.profile import HostProfile, GuestProfile
from app.database.session import get_db
from app.features.auth.services import get_current_user
from app.features.admin.schemas import (
    AdminUserResponse, AdminStatsResponse, UserStatusUpdateRequest,
    GuestVerifyUpdateRequest, AdminBookingsResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

def get_user_or_404(user_id: str, db: Session) -> User:
    user = db.query(User).options(joinedload(User.guest_profile)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.get("/users", response_model=List[AdminUserResponse])
def get_all_users(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).options(joinedload(User.guest_profile)).all()

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_hosts = db.query(User).filter(User.user_type == UserType.HOST).count()
    total_guests = db.query(User).filter(User.user_type == UserType.GUEST).count()
    total_soldiers = db.query(GuestProfile).filter(GuestProfile.is_soldier_or_national_service == True).count()
    
    active_matches = db.query(Match).filter(Match.status == MatchStatus.MATCHED).count()
    pending_matches = db.query(Match).filter(Match.status == MatchStatus.PENDING).count()
    total_matches = db.query(Match).count()
    
    match_rate = round((active_matches / total_matches * 100), 1) if total_matches > 0 else 0.0
    
    open_posts = db.query(GuestPost).filter(GuestPost.status == PostStatus.OPEN).all()
    open_posts_count = len(open_posts)
    urgent_posts_count = sum(1 for post in open_posts if post.is_urgent)
    total_posts_count = db.query(GuestPost).count()

    # Cities breakdown (only valid, specified cities)
    city_counts = db.query(HostProfile.city, func.count(HostProfile.id))\
                    .filter(
                        HostProfile.city.isnot(None),
                        HostProfile.city != "",
                        HostProfile.city != "Not Specified",
                        HostProfile.city != "לא צוין"
                    )\
                    .group_by(HostProfile.city)\
                    .order_by(func.count(HostProfile.id).desc())\
                    .limit(10)\
                    .all()
    cities_breakdown = [{"city": str(city), "count": int(count)} for city, count in city_counts]

    # Kashrut breakdown (all 4 options guaranteed)
    kashrut_counts_raw = db.query(HostProfile.kashrut_level, func.count(HostProfile.id))\
                           .filter(HostProfile.kashrut_level.isnot(None))\
                           .group_by(HostProfile.kashrut_level)\
                           .all()
    
    kashrut_counts_map = {}
    for k, count in kashrut_counts_raw:
        raw_val = k.value if hasattr(k, 'value') else str(k)
        kashrut_counts_map[raw_val] = int(count)

    all_kashrut_options = [
        ("glatt_mehadrin", "גלאט / מהדרין"),
        ("kosher", "כשר"),
        ("basic", "בסיסי"),
        ("none", "ללא כשרות")
    ]

    kashrut_breakdown = [
        {"level": label, "count": kashrut_counts_map.get(key, 0)}
        for key, label in all_kashrut_options
    ]

    return {
        "total_hosts": total_hosts, 
        "total_guests": total_guests,
        "total_soldiers": total_soldiers,
        "active_matches": active_matches,
        "pending_matches": pending_matches,
        "open_posts": open_posts_count, 
        "urgent_posts": urgent_posts_count,
        "total_posts": total_posts_count,
        "match_rate_percentage": match_rate,
        "cities_breakdown": cities_breakdown,
        "kashrut_breakdown": kashrut_breakdown,
    }


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse)
def update_user_status(user_id: str, payload: UserStatusUpdateRequest, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = get_user_or_404(user_id, db)
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/verify-guest", response_model=AdminUserResponse)
def verify_guest_status(user_id: str, payload: GuestVerifyUpdateRequest, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = get_user_or_404(user_id, db)
    if user.user_type != UserType.GUEST or not user.guest_profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid guest profile required")
    
    user.guest_profile.is_soldier_or_national_service = payload.is_soldier_or_national_service
    db.commit()
    db.refresh(user)
    return user


@router.get("/bookings", response_model=AdminBookingsResponse)
def get_bookings_moderation(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    matches = db.query(Match).options(
        joinedload(Match.guest_post).joinedload(GuestPost.guest_profile).joinedload(GuestProfile.user),
        joinedload(Match.host_profile).joinedload(HostProfile.user)
    ).all()
    posts = db.query(GuestPost).options(
        joinedload(GuestPost.guest_profile).joinedload(GuestProfile.user)
    ).all()

    return {"matches": matches, "posts": posts}


@router.delete("/posts/{post_id}", status_code=status.HTTP_200_OK)
def delete_post_moderation(post_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    post = db.query(GuestPost).filter(GuestPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"message": "Post successfully deleted"}


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user_moderation(user_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = get_user_or_404(user_id, db)
    if str(user.id) == str(admin_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")
    db.delete(user)
    db.commit()
    return {"message": "User successfully deleted"}


# --- User Identity & Moderation Verification Queue Endpoints ---
from app.database.models.verification import VerificationRequest, VerificationStatus
from app.database.models.user import UserVerificationStatus
from app.features.admin.schemas import VerificationRejectRequest

@router.get("/verifications/pending")
def get_pending_verifications(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    requests = db.query(VerificationRequest).options(
        joinedload(VerificationRequest.user)
    ).filter(
        VerificationRequest.status == VerificationStatus.PENDING_ADMIN
    ).order_by(VerificationRequest.created_at.asc()).all()

    return [
        {
            "id": req.id,
            "user_id": req.user_id,
            "user_full_name": req.user.full_name if req.user else "Unknown User",
            "user_email": req.user.email if req.user else "",
            "verification_type": req.verification_type.value if hasattr(req.verification_type, 'value') else str(req.verification_type),
            "status": req.status.value if hasattr(req.status, 'value') else str(req.status),
            "selfie_url": f"/api/verification/files/{req.selfie_image_path}",
            "document_url": f"/api/verification/files/{req.document_image_path}",
            "secondary_document_url": f"/api/verification/files/{req.secondary_document_image_path}" if req.secondary_document_image_path else None,
            "ai_confidence_score": req.ai_confidence_score,
            "created_at": req.created_at,
        }
        for req in requests
    ]

@router.post("/verifications/{request_id}/approve")
def approve_verification_request(request_id: str, admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    req = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found")

    req.status = VerificationStatus.APPROVED
    req.rejection_reason = None
    
    user = db.query(User).filter(User.id == req.user_id).first()
    if user:
        user.verification_status = UserVerificationStatus.APPROVED

    db.commit()

    # Notify User live via WebSocket
    try:
        import asyncio
        from datetime import datetime
        from app.features.notifications.router import manager

        asyncio.create_task(
            manager.send_personal_notification(
                {
                    "id": f"approved_{req.id}",
                    "title": "חשבונך אושר בהצלחה! 🎉",
                    "message": "פרופיל המשתמש שלך אושר כראוי וכל חסמי הגישה הוסרו.",
                    "type": "success",
                    "time": datetime.now().strftime("%H:%M")
                },
                str(req.user_id)
            )
        )
    except Exception as e:
        print(f"Failed to dispatch user approval notification: {e}")

    return {"message": "Verification request approved successfully", "user_id": req.user_id}

@router.post("/verifications/{request_id}/reject")
def reject_verification_request(
    request_id: str,
    payload: VerificationRejectRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    req = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found")

    req.status = VerificationStatus.REJECTED
    req.rejection_reason = payload.rejection_reason

    user = db.query(User).filter(User.id == req.user_id).first()
    if user:
        user.verification_status = UserVerificationStatus.REJECTED

    db.commit()

    # Notify User live via WebSocket
    try:
        import asyncio
        from datetime import datetime
        from app.features.notifications.router import manager

        asyncio.create_task(
            manager.send_personal_notification(
                {
                    "id": f"rejected_{req.id}",
                    "title": "בקשת האימות נדחתה ⚠️",
                    "message": f"סיבת הדחייה: {payload.rejection_reason}",
                    "type": "alert",
                    "time": datetime.now().strftime("%H:%M")
                },
                str(req.user_id)
            )
        )
    except Exception as e:
        print(f"Failed to dispatch user rejection notification: {e}")

    return {"message": "Verification request rejected", "user_id": req.user_id}


# --- Admin Support Chat Management Endpoints ---
from app.database.models.support_message import SupportMessage

@router.get("/support-chats/{target_user_id}")
def get_user_support_chat_history(
    target_user_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retrieve message history between admin and a specific user."""
    target_uuid = uuid.UUID(target_user_id)
    messages = db.query(SupportMessage).options(
        joinedload(SupportMessage.sender)
    ).filter(
        SupportMessage.user_id == target_uuid
    ).order_by(SupportMessage.created_at.asc()).all()

    return [
        {
            "id": msg.id,
            "user_id": msg.user_id,
            "sender_id": msg.sender_id,
            "sender_name": "הנהלת המערכת" if msg.sender_id == admin_user.id or (msg.sender and msg.sender.user_type == UserType.ADMIN) else (msg.sender.full_name if msg.sender else "משתמש"),
            "is_admin_reply": (msg.sender_id == admin_user.id or (msg.sender and msg.sender.user_type == UserType.ADMIN)),
            "content": msg.content,
            "created_at": msg.created_at
        }
        for msg in messages
    ]

class SupportAdminReplyRequest(BaseModel):
    content: str

@router.post("/support-chats/{target_user_id}/reply")
async def reply_to_user_support_chat(
    target_user_id: str,
    payload: SupportAdminReplyRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin sends a reply message to a user's support chat thread."""
    target_uuid = uuid.UUID(target_user_id)
    user = db.query(User).filter(User.id == target_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    sender_id = admin_user.id
    admin_in_db = db.query(User).filter(User.id == admin_user.id).first()
    if not admin_in_db:
        admin_in_db = db.query(User).filter(User.user_type == UserType.ADMIN).first()
        if admin_in_db:
            sender_id = admin_in_db.id
        else:
            from app.core.config import settings
            from app.database.models.user import UserVerificationStatus
            admin_in_db = User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                email=settings.ADMIN_EMAIL,
                phone_number="0000000000",
                hashed_password="admin_dummy_hash",
                full_name="System Administrator",
                user_type=UserType.ADMIN,
                is_active=True,
                is_email_verified=True,
                is_phone_verified=True,
                verification_status=UserVerificationStatus.APPROVED,
            )
            db.add(admin_in_db)
            db.commit()
            db.refresh(admin_in_db)
            sender_id = admin_in_db.id

    msg = SupportMessage(
        user_id=target_uuid,
        sender_id=sender_id,
        content=payload.content.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    ws_payload = {
        "id": str(msg.id),
        "user_id": str(msg.user_id),
        "sender_id": str(msg.sender_id),
        "sender_name": "הנהלת המערכת",
        "content": msg.content,
        "created_at": msg.created_at.isoformat()
    }

    # Now safe — async def means there IS a running event loop
    import asyncio
    from datetime import datetime
    from app.features.notifications.router import manager
    from app.features.verification.router import support_ws_manager

    # Broadcast message to user's support chat WebSocket
    asyncio.create_task(support_ws_manager.broadcast(str(target_uuid), ws_payload, str(admin_user.id)))

    # Bell notification to user
    asyncio.create_task(
        manager.send_personal_notification(
            {
                "id": f"supp_{msg.id}",
                "title": "תשובה חדשה מהנהלת המערכת 💬",
                "message": payload.content.strip(),
                "type": "message",
                "time": datetime.now().strftime("%H:%M")
            },
            str(target_uuid)
        )
    )

    return {
        "id": msg.id,
        "user_id": msg.user_id,
        "sender_id": msg.sender_id,
        "sender_name": "הנהלת המערכת",
        "content": msg.content,
        "created_at": msg.created_at
    }

