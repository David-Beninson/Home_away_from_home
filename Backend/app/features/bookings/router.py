import uuid
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models.user import User, UserType
from app.database.models.match import Match, MatchStatus
from app.database.models.post import GuestPost, PostStatus
from app.features.auth.services import get_current_user
from app.features.bookings.schemas import BookingRequestCreate, BookingResponse, MatchStatusUpdate
from app.agent.services import AgentService
from app.agent.prompts import get_default_icebreakers
from app.features.posts.router import post_manager

router = APIRouter(prefix="", tags=["Bookings & Matches"])

@router.get("/bookings/count")
def get_bookings_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.GUEST or not current_user.guest_profile:
        return {"posts_count": 0, "bookings_count": 0, "total_count": 0}
        
    posts_count = db.query(GuestPost).filter(
        GuestPost.guest_profile_id == current_user.guest_profile.id
    ).count()
    
    bookings_count = db.query(Match).join(GuestPost).filter(
        GuestPost.guest_profile_id == current_user.guest_profile.id
    ).count()
    
    return {
        "posts_count": posts_count,
        "bookings_count": bookings_count,
        "total_count": posts_count + bookings_count
    }

@router.get("/bookings/guest-status/{host_id}")
def check_guest_booking_status(
    host_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.GUEST or not current_user.guest_profile:
        return {"can_request": True, "reason": None}

    # 1. Check if guest is matched anywhere for upcoming weekend/active post
    matched_anywhere = db.query(Match).join(GuestPost).filter(
        GuestPost.guest_profile_id == current_user.guest_profile.id,
        Match.status == MatchStatus.MATCHED
    ).first()
    if matched_anywhere:
        return {
            "can_request": False,
            "reason": "כבר נמצא לכם מקום אירוח לשבת! לא ניתן לבקש אירוחים נוספים."
        }

    # 2. Check if guest has pending match/request specifically with THIS host
    pending_this_host = db.query(Match).join(GuestPost).filter(
        GuestPost.guest_profile_id == current_user.guest_profile.id,
        Match.host_profile_id == host_id,
        Match.status == MatchStatus.PENDING
    ).first()
    if pending_this_host:
        return {
            "can_request": False,
            "reason": "כבר שלחת בקשת אירוח למארח זה. יש להמתין לתשובתו."
        }

    return {"can_request": True, "reason": None}

def get_upcoming_friday_datetime() -> datetime:
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()
    days_until_friday = (4 - today.weekday()) % 7
    friday_date = today + timedelta(days=days_until_friday)
    return datetime(friday_date.year, friday_date.month, friday_date.day, 0, 0, 0, tzinfo=timezone.utc)

@router.post("/bookings/request", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def request_booking(
    req: BookingRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.GUEST or not current_user.guest_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only guests can request bookings"
        )
        
    guest_post_id = req.guest_post_id
    target_date = req.requested_date or req.start_date or get_upcoming_friday_datetime()
    target_description = req.description or "בקשת אירוח ישירה למארח"
    target_guests = req.guests_count or 1

    # Check if guest is matched anywhere
    matched_anywhere = db.query(Match).join(GuestPost).filter(
        GuestPost.guest_profile_id == current_user.guest_profile.id,
        Match.status == MatchStatus.MATCHED
    ).first()
    if matched_anywhere:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="כבר נמצא לכם מקום אירוח לשבת! לא ניתן לבקש אירוחים נוספים."
        )

    # Check if host is already matched or has a pending request from/with this host
    existing_post_match = db.query(Match).join(GuestPost).filter(
        GuestPost.guest_profile_id == current_user.guest_profile.id,
        Match.host_profile_id == req.host_profile_id,
        Match.status.in_([MatchStatus.PENDING, MatchStatus.MATCHED])
    ).first()
    
    if existing_post_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="כבר שלחת בקשת אירוח למארח זה. יש להמתין לתשובתו."
        )

    if not guest_post_id:
        post = GuestPost(
            guest_profile_id=current_user.guest_profile.id,
            requested_date=target_date,
            start_date=req.start_date or target_date,
            end_date=req.end_date,
            nights_count=req.nights_count or 1,
            description=target_description,
            guests_count=target_guests,
            claimed_by_host_id=req.host_profile_id,
            is_direct_request=True,
            status=PostStatus.PENDING
        )
        db.add(post)
        db.flush()
        guest_post_id = post.id
    else:
        post = db.query(GuestPost).filter(
            GuestPost.id == guest_post_id,
            GuestPost.guest_profile_id == current_user.guest_profile.id
        ).first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guest post not found or not owned by you"
            )
        post.requested_date = target_date
        if req.start_date: post.start_date = req.start_date
        if req.end_date: post.end_date = req.end_date
        if req.nights_count: post.nights_count = req.nights_count
        if req.description: post.description = req.description
        if req.guests_count: post.guests_count = req.guests_count
        post.claimed_by_host_id = req.host_profile_id
        post.is_direct_request = True
        post.status = PostStatus.PENDING
        db.flush()
        
    existing = db.query(Match).filter(
        Match.guest_post_id == guest_post_id,
        Match.host_profile_id == req.host_profile_id
    ).first()
    if existing:
        return existing
        
    new_match = Match(
        guest_post_id=guest_post_id,
        host_profile_id=req.host_profile_id,
        status=MatchStatus.PENDING
    )
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    await post_manager.broadcast_updates()

    # Send notification trigger to host via WebSocket
    try:
        from app.database.models.profile import HostProfile
        from app.features.notifications.router import manager as notification_manager
        host_prof = db.query(HostProfile).filter(HostProfile.id == req.host_profile_id).first()
        if host_prof and host_prof.user_id:
            await notification_manager.send_personal_notification({
                "id": str(uuid.uuid4()),
                "title": "בקשת אירוח חדשה  Shabbat",
                "message": f"קיבלת בקשת אירוח מ{current_user.full_name or 'אורח'}",
                "type": "alert",
                "time": "עכשיו",
                "isRead": False
            }, str(host_prof.user_id))
    except Exception as e:
        print(f"Failed to trigger booking request notification: {e}")

    return new_match

@router.get("/bookings/incoming", response_model=List[BookingResponse])
def get_incoming_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != UserType.HOST or not current_user.host_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only hosts can view incoming bookings"
        )
    return db.query(Match).filter(
        Match.host_profile_id == current_user.host_profile.id,
        Match.status == MatchStatus.PENDING
    ).all()

@router.patch("/bookings/{match_id}/respond", response_model=BookingResponse)
async def respond_booking(
    match_id: uuid.UUID,
    data: MatchStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking request not found"
        )
        
    is_host = current_user.user_type == UserType.HOST and current_user.host_profile and match.host_profile_id == current_user.host_profile.id
    is_guest = current_user.user_type == UserType.GUEST and current_user.guest_profile and match.guest_post and match.guest_post.guest_profile_id == current_user.guest_profile.id
    
    if not (is_host or is_guest):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to respond to this booking request"
        )
        
    post = match.guest_post
    
    if is_guest:
        # Double Action Prevention: Guest can only respond if post is currently PENDING
        if not post or post.status != PostStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="הבקשה כבר אינה במצב ממתין לאישורך"
            )
        if data.status == MatchStatus.MATCHED:
            match.status = MatchStatus.MATCHED
            post.status = PostStatus.MATCHED
            # Reject other pending matches for this guest post
            db.query(Match).filter(
                Match.guest_post_id == post.id,
                Match.id != match.id,
                Match.status == MatchStatus.PENDING
            ).update({"status": MatchStatus.REJECTED})
        elif data.status == MatchStatus.REJECTED:
            match.status = MatchStatus.REJECTED
            post.claimed_by_host_id = None
            post.status = PostStatus.OPEN
    elif is_host:
        if data.status == MatchStatus.MATCHED:
            if post:
                if post.status == PostStatus.MATCHED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This guest hosting request has already been matched"
                    )
                post.status = PostStatus.MATCHED
                post.claimed_by_host_id = current_user.host_profile.id
                db.query(Match).filter(
                    Match.guest_post_id == post.id,
                    Match.id != match.id,
                    Match.status == MatchStatus.PENDING
                ).update({"status": MatchStatus.REJECTED})
        elif data.status == MatchStatus.REJECTED:
            match.status = MatchStatus.REJECTED
        match.status = data.status

    db.commit()
    db.refresh(match)
    await post_manager.broadcast_updates()

    # Trigger notification to recipient
    try:
        from app.features.notifications.router import manager as notification_manager
        target_user_id = None
        status_str = "אושרה" if match.status == MatchStatus.MATCHED else "נדחתה"
        
        if is_host and match.guest_post and match.guest_post.guest_profile:
            target_user_id = match.guest_post.guest_profile.user_id
            note_title = f"בקשת האירוח שלך {status_str}!"
            note_msg = f"המארח {current_user.full_name or ''} {status_str} את בקשת האירוח לשבת."
        elif is_guest and match.host_profile:
            target_user_id = match.host_profile.user_id
            note_title = f"תשובה מענה לבקשת אירוח"
            note_msg = f"האורח {current_user.full_name or ''} {status_str} את הצעת האירוח."

        if target_user_id:
            await notification_manager.send_personal_notification({
                "id": str(uuid.uuid4()),
                "title": note_title,
                "message": note_msg,
                "type": "success" if match.status == MatchStatus.MATCHED else "alert",
                "time": "עכשיו",
                "isRead": False
            }, str(target_user_id))
    except Exception as e:
        print(f"Failed to trigger booking response notification: {e}")

    return match


@router.get("/matches/{match_id}/details")
def get_match_details(
    match_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    is_host = current_user.user_type == UserType.HOST and current_user.host_profile and match.host_profile_id == current_user.host_profile.id
    is_guest = current_user.user_type == UserType.GUEST and current_user.guest_profile and match.guest_post.guest_profile_id == current_user.guest_profile.id
    
    if not (is_host or is_guest):
        raise HTTPException(status_code=403, detail="Not authorized to view this match details")
        
    host_user = match.host_profile.user
    guest_user = match.guest_post.guest_profile.user
    
    if match.status == MatchStatus.MATCHED:
        whatsapp_recipient = guest_user if is_host else host_user
        phone_number = whatsapp_recipient.phone_number.replace("+", "").replace("-", "").strip()
        
        is_guest_anonymous = match.guest_post.guest_profile.is_anonymous if match.guest_post.guest_profile else False
        is_guest_soldier = match.guest_post.guest_profile.is_soldier_or_national_service if match.guest_post.guest_profile else False
        
        if is_guest_anonymous and is_host:
            guest_name = "Soldier" if is_guest_soldier else "Anonymous Guest"
        else:
            guest_name = guest_user.full_name
            
        host_name = host_user.full_name
        
        recipient_name = guest_name if is_host else host_name
        message_text = f"Hi {recipient_name}! This is {current_user.full_name} from Hosting for Shabbat. Looking forward to hosting/visiting this upcoming weekend!"
        encoded_message = urllib.parse.quote(message_text)
        whatsapp_link = f"https://wa.me/{phone_number}?text={encoded_message}"
    else:
        whatsapp_link = None
        host_name = "Anonymous Host"
        guest_name = "Anonymous Guest"

    host_info = {
        "city": match.host_profile.city,
        "kashrut_level": match.host_profile.kashrut_level,
        "religious_orientation": match.host_profile.religious_orientation,
        "free_text_notes": match.host_profile.free_text_notes,
    }
    guest_info = {
        "is_soldier": match.guest_post.guest_profile.is_soldier_or_national_service,
        "description": match.guest_post.description,
        "food_preferences_allergies": match.guest_post.guest_profile.food_preferences_allergies,
        "skills_give_take": match.guest_post.guest_profile.skills_give_take
    }
    icebreakers = AgentService.generate_icebreakers(host_info, guest_info)
    
    return {
        "match_id": str(match.id),
        "status": match.status,
        "host_name": host_name,
        "guest_name": guest_name,
        "whatsapp_link": whatsapp_link,
        "icebreakers": icebreakers
    }


@router.get("/agent/icebreakers")
def get_quick_icebreakers(
    match_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_role = "host" if (current_user and current_user.user_type == UserType.HOST) else "guest"
    if match_id:
        match = db.query(Match).filter(Match.id == match_id).first()
        if match and match.host_profile and match.guest_post and match.guest_post.guest_profile:
            host_info = {
                "city": match.host_profile.city,
                "kashrut_level": match.host_profile.kashrut_level,
                "religious_orientation": match.host_profile.religious_orientation,
                "free_text_notes": match.host_profile.free_text_notes,
            }
            guest_info = {
                "is_soldier": match.guest_post.guest_profile.is_soldier_or_national_service,
                "description": match.guest_post.description,
                "food_preferences_allergies": match.guest_post.guest_profile.food_preferences_allergies,
                "skills_give_take": match.guest_post.guest_profile.skills_give_take
            }
            return {"icebreakers": AgentService.generate_icebreakers(host_info, guest_info, user_role=user_role)}

    return {"icebreakers": get_default_icebreakers(user_role)}



