from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, select
from typing import List, Any
import uuid
from datetime import datetime, timezone, timedelta

from app.database.session import get_db
from app.database.models import User, Match, GuestPost, MatchStatus, PostStatus
from app.database.models.review import Review, ReviewStatus
from app.database.models.admin_alert import AdminAlert
from app.features.auth.services import get_current_user
from app.features.notifications.router import manager

router = APIRouter(prefix="/reviews", tags=["reviews"])

# --- Schemas ---
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    match_id: str
    reviewee_id: str
    rating: int = Field(ge=1, le=5)
    content: str
    is_severe_flag: bool = False

class ReviewStatusUpdate(BaseModel):
    status: ReviewStatus

# --- Helpers ---
async def send_admin_alert(alert: AdminAlert, db: Session):
    # Find all admins
    admins = db.query(User).filter(User.user_type == "admin").all()
    message = {
        "type": "admin_alert",
        "alert_id": str(alert.id),
        "alert_type": alert.alert_type,
        "payload": alert.payload
    }
    for admin in admins:
        await manager.send_personal_notification(message, str(admin.id))


@router.get("/pending")
def get_pending_reviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Find matches where the stay has ended and the user hasn't reviewed yet."""
    # Find all MATCHED matches for this user
    matches = db.query(Match).join(GuestPost, Match.guest_post_id == GuestPost.id).filter(
        Match.status == MatchStatus.MATCHED,
        or_(
            GuestPost.guest_profile_id == current_user.guest_profile.id if current_user.guest_profile else False,
            Match.host_profile_id == current_user.host_profile.id if current_user.host_profile else False
        )
    ).all()

    pending = []
    now = datetime.now(timezone.utc)
    for m in matches:
        # Check if match/post is valid
        if m.guest_post.status not in (PostStatus.MATCHED,):
            continue
            
        # Calculate end date
        end_date = m.guest_post.end_date
        if not end_date and m.guest_post.start_date and m.guest_post.nights_count:
            end_date = m.guest_post.start_date + timedelta(days=m.guest_post.nights_count)
            
        if not end_date or end_date > now:
            continue
            
        # Check if current user already left a review
        existing = db.query(Review).filter(
            Review.match_id == m.id,
            Review.reviewer_id == current_user.id
        ).first()
        
        if not existing:
            # Determine reviewee
            if current_user.guest_profile and m.guest_post.guest_profile_id == current_user.guest_profile.id:
                reviewee_id = m.host_profile.user_id
            else:
                reviewee_id = m.guest_post.guest_profile.user_id
                
            pending.append({
                "match_id": str(m.id),
                "reviewee_id": str(reviewee_id),
                "end_date": end_date,
            })
            
    return pending

@router.post("")
async def create_review(data: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify match exists and user is part of it
    match = db.query(Match).filter(Match.id == data.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    # Check if review already exists
    existing = db.query(Review).filter(
        Review.match_id == match.id,
        Review.reviewer_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted for this match")

    # Fallback keyword detection for severity
    severe_keywords = ["הטרדה", "אלימות", "גניבה", "משטרה", "סכנה", "harassment", "violence", "police", "stolen", "danger"]
    auto_flag = any(kw in data.content.lower() for kw in severe_keywords)
    is_severe = data.is_severe_flag or auto_flag

    review = Review(
        match_id=match.id,
        reviewer_id=current_user.id,
        reviewee_id=data.reviewee_id,
        rating=data.rating,
        content=data.content,
        is_severe_flag=is_severe,
        status=ReviewStatus.ACTIVE if not is_severe else ReviewStatus.UNDER_REVIEW
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    if is_severe:
        # Create Admin Alert
        reviewee = db.query(User).filter(User.id == data.reviewee_id).first()
        payload = {
            "review_id": str(review.id),
            "reviewer_id": str(current_user.id),
            "reviewer_name": current_user.full_name,
            "reviewee_id": str(reviewee.id) if reviewee else str(data.reviewee_id),
            "reviewee_name": reviewee.full_name if reviewee else "Unknown",
            "match_id": str(match.id),
            "rating": review.rating,
            "content": review.content,
            "auto_flagged": auto_flag,
            "user_flagged": data.is_severe_flag
        }
        alert = AdminAlert(
            alert_type="severe_review",
            reference_id=review.id,
            payload=payload
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        await send_admin_alert(alert, db)

    return {"status": "success", "review_id": str(review.id)}

@router.get("/host/{host_user_id}")
def get_host_reviews(host_user_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(
        Review.reviewee_id == host_user_id,
        Review.status == ReviewStatus.ACTIVE
    ).all()
    return [{
        "id": str(r.id),
        "reviewer_name": r.reviewer.full_name,
        "rating": r.rating,
        "content": r.content,
        "created_at": r.created_at
    } for r in reviews]

@router.get("/guest/{guest_user_id}")
def get_guest_reviews(guest_user_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(
        Review.reviewee_id == guest_user_id,
        Review.status == ReviewStatus.ACTIVE
    ).all()
    return [{
        "id": str(r.id),
        "reviewer_name": r.reviewer.full_name,
        "rating": r.rating,
        "content": r.content,
        "created_at": r.created_at
    } for r in reviews]

@router.get("/match/{match_id}")
def get_match_reviews(match_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(
        Review.match_id == match_id,
        Review.status == ReviewStatus.ACTIVE
    ).all()
    return [{
        "id": str(r.id),
        "reviewer_id": str(r.reviewer_id),
        "reviewer_name": r.reviewer.full_name,
        "reviewee_id": str(r.reviewee_id),
        "rating": r.rating,
        "content": r.content,
        "created_at": r.created_at
    } for r in reviews]

@router.get("/alerts")
def get_admin_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    alerts = db.query(AdminAlert).order_by(AdminAlert.created_at.desc()).all()
    return [{
        "id": str(a.id),
        "alert_type": a.alert_type,
        "reference_id": str(a.reference_id) if a.reference_id else None,
        "payload": a.payload,
        "is_resolved": a.is_resolved,
        "created_at": a.created_at
    } for a in alerts]

@router.patch("/{review_id}/status")
def update_review_status(review_id: str, data: ReviewStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = data.status
    db.commit()
    return {"status": "success", "new_status": review.status}
