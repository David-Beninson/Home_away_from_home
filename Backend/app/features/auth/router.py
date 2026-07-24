import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.agent.services import AgentService
from app.core.config import settings
from app.database.models.profile import GuestProfile, HostProfile
from app.database.models.user import User, UserType
from app.database.session import get_db
from app.features.auth.schemas import (
    GuestProfileBase, HostProfileBase, LoginRequest, UserCreate, UserMeResponse, VerifyEmailRequest, VerifyPhoneRequest,
    OTPRequestSchema, UserRegisterVerifySchema
)
from app.features.auth.services import (
    create_access_token, get_current_user, hash_password, send_telegram_message, send_verification_email, validate_otp, verify_password
)

# Explicitly import the existing email sending service
from app.features.auth.services import send_verification_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
_OTP_TTL = timedelta(minutes=15)

# Temporary in-memory OTP store for registration flow.
otp_store = {}  # format: {phone_number: {"code": str, "expires_at": datetime}}

@router.post("/register/request-otp", status_code=status.HTTP_200_OK)
def request_otp(data: OTPRequestSchema, db: Session = Depends(get_db)):
    phone_exists = db.query(db.query(User.id).filter(User.phone_number == data.phone_number).exists()).scalar()
    if phone_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    email_exists = db.query(db.query(User.id).filter(User.email == data.email).exists()).scalar()
    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
    
    code = f"{random.randint(100_000, 999_999)}"
    expires_at = datetime.now(timezone.utc) + _OTP_TTL
    otp_store[data.phone_number] = {
        "code": code,
        "expires_at": expires_at
    }
    
    try:
        email_sent = send_verification_email(data.email, code)
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email"
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email service error: {str(exc)}"
        )
    
    return {"message": "Verification code sent to email successfully"}

@router.post("/register/verify", status_code=status.HTTP_201_CREATED)
def register_verify(data: UserRegisterVerifySchema, db: Session = Depends(get_db)):
    otp_entry = otp_store.get(data.phone_number)
    if not otp_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP verification code requested for this phone number"
        )
    
    if otp_entry["expires_at"] < datetime.now(timezone.utc):
        otp_store.pop(data.phone_number, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP verification code has expired"
        )
        
    if otp_entry["code"] != data.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code"
        )
        
    if db.query(db.query(User.id).filter((User.email == data.email) | (User.phone_number == data.phone_number)).exists()).scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone already registered"
        )
        
    new_user = User(
        email=data.email,
        phone_number=data.phone_number,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        user_type=UserType(data.user_type.lower()),
        is_active=True,
        is_phone_verified=True,
        is_email_verified=False
    )
    db.add(new_user)
    db.flush()
    
    if new_user.user_type == UserType.HOST:
        db.add(HostProfile(user_id=new_user.id, residential_address="Not Specified"))
    elif new_user.user_type == UserType.GUEST:
        db.add(GuestProfile(user_id=new_user.id))
        
    db.commit()
    otp_store.pop(data.phone_number, None)
    
    u_type = new_user.user_type.value if hasattr(new_user.user_type, "value") else str(new_user.user_type)
    return {
        "access_token": create_access_token({"sub": str(new_user.id), "user_type": u_type}),
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "full_name": new_user.full_name,
            "user_type": new_user.user_type,
            "is_email_verified": new_user.is_email_verified,
            "is_phone_verified": new_user.is_phone_verified,
        }
    }

_MSG_ONBOARDING = "👋 Hello!\n\nPlease send the <b>6-digit verification code</b> you received.\n📌 Example: <code>123456</code>"
_MSG_INVALID_CODE = "❌ The code is incorrect or expired."
_MSG_SUCCESS = "✅ <b>Verification completed!</b> 🎉\n\nHello {name}, your phone number has been verified."


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if user_in.email == settings.ADMIN_EMAIL or user_in.user_type == UserType.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot register with admin email or role")

    if db.query(db.query(User.id).filter((User.email == user_in.email) | (User.phone_number == user_in.phone_number)).exists()).scalar():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or phone already registered")

    expires_at = datetime.now(timezone.utc) + _OTP_TTL
    email_code = f"{random.randint(100_000, 999_999)}"
    telegram_code = f"{random.randint(100_000, 999_999)}"

    new_user = User(
        email=user_in.email, phone_number=user_in.phone_number, full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password), user_type=UserType(user_in.user_type.lower()),
        biography=user_in.biography, is_email_verified=False, email_verification_code=email_code,
        email_verification_expires_at=expires_at, is_phone_verified=False,
        telegram_verification_code=telegram_code, telegram_verification_expires_at=expires_at,
    )
    db.add(new_user)
    db.flush()

    if new_user.user_type == UserType.HOST:
        db.add(HostProfile(user_id=new_user.id, residential_address="Not Specified"))
    elif new_user.user_type == UserType.GUEST:
        db.add(GuestProfile(user_id=new_user.id))

    db.commit()
    background_tasks.add_task(send_verification_email, new_user.email, email_code)

    return {
        "message": "User registered successfully. Verification codes generated.",
        "user_id": str(new_user.id), "telegram_verification_code": telegram_code,
        "telegram_bot_username": settings.TELEGRAM_BOT_USERNAME,
    }

@router.post("/login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    if login_data.username == settings.ADMIN_EMAIL and login_data.password == settings.ADMIN_PASSWORD:
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if admin_user:
            return {
                "access_token": create_access_token({"sub": str(admin_user.id), "user_type": "admin"}),
                "token_type": "bearer",
                "user": {
                    "id": str(admin_user.id),
                    "email": admin_user.email,
                    "full_name": admin_user.full_name,
                    "user_type": admin_user.user_type,
                    "is_email_verified": admin_user.is_email_verified,
                    "is_phone_verified": admin_user.is_phone_verified,
                }
            }
        return {
            "access_token": create_access_token({"sub": "admin", "user_type": "admin"}),
            "token_type": "bearer",
            "user": {
                "id": "00000000-0000-0000-0000-000000000000",
                "email": settings.ADMIN_EMAIL,
                "full_name": "System Administrator",
                "user_type": "admin",
                "is_email_verified": True,
                "is_phone_verified": True,
            }
        }

    user = db.query(User).filter(
        (User.email == login_data.username) | (User.phone_number == login_data.username)
    ).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email/phone or password")

    u_type = user.user_type.value if hasattr(user.user_type, "value") else str(user.user_type)
    return {
        "access_token": create_access_token({"sub": str(user.id), "user_type": u_type}),
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "user_type": user.user_type,
            "is_email_verified": user.is_email_verified,
            "is_phone_verified": user.is_phone_verified,
        }
    }

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/verify/email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_email_verified:
        return {"message": "Email is already verified"}

    validate_otp(user.email_verification_code, user.email_verification_expires_at, data.code)
    user.is_email_verified = True
    user.email_verification_code, user.email_verification_expires_at = None, None
    db.commit()
    return {"message": "Email verified successfully"}

@router.post("/verify/phone")
def verify_phone(data: VerifyPhoneRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_phone_verified:
        return {"message": "Phone number is already verified"}

    validate_otp(user.telegram_verification_code, user.telegram_verification_expires_at, data.code)
    user.is_phone_verified = True
    user.telegram_verification_code, user.telegram_verification_expires_at = None, None
    db.commit()
    return {"message": "Phone verified successfully"}

@router.post("/telegram-webhook")
def telegram_webhook(update: dict, db: Session = Depends(get_db)):
    message = update.get("message", {})
    chat = message.get("chat", {})
    text = message.get("text", "").strip()

    if not chat or not text or not (text.isdigit() and len(text) == 6):
        if chat.get("id"):
            send_telegram_message(str(chat["id"]), _MSG_ONBOARDING)
        return {"status": "ignored"}

    chat_id = str(chat["id"])
    user = db.query(User).filter(User.telegram_verification_code == text, User.telegram_verification_expires_at > datetime.now(timezone.utc)).first()

    if not user:
        send_telegram_message(chat_id, _MSG_INVALID_CODE)
        return {"status": "invalid_code"}

    user.is_phone_verified = True
    user.telegram_chat_id = chat_id
    user.telegram_verification_code, user.telegram_verification_expires_at = None, None
    db.commit()

    send_telegram_message(chat_id, _MSG_SUCCESS.format(name=user.full_name))
    return {"status": "verified"}

@router.put("/profile/host")
async def update_host_profile(profile_data: HostProfileBase, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.user_type != UserType.HOST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a host")

    profile = current_user.host_profile
    if not profile:
        profile = HostProfile(user_id=current_user.id)
        current_user.host_profile = profile

    dump_data = profile_data.model_dump()
    for key, value in dump_data.items():
        if value is not None or key in profile_data.model_fields_set:
            setattr(profile, key, value)

    if "available_spots" not in profile_data.model_fields_set or dump_data.get("available_spots") is None:
        profile.available_spots = profile.max_guests

    embed_text = " ".join(filter(None, [profile.residential_address, profile.neighborhood_type, profile.pets_description, profile.housing_type, current_user.biography]))
    if embed_text:
        try:
            profile.atmosphere_vector = AgentService.generate_embedding(embed_text)
        except Exception as err:
            print(f"Warning: Failed to generate atmosphere embedding: {err}")

    db.add(profile)
    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    try:
        from app.features.posts.router import post_manager
        await post_manager.broadcast_event({
            "type": "HOST_PROFILE_UPDATED",
            "host_profile_id": str(profile.id),
            "residential_address": getattr(profile, "residential_address", None),
            "kashrut_level": profile.kashrut_level,
            "max_guests": profile.max_guests,
            "available_spots": profile.available_spots,
            "religious_orientation": getattr(profile, "religious_orientation", None),
            "free_text_notes": getattr(profile, "free_text_notes", None),
            "neighborhood": getattr(profile, "neighborhood", None),
            "full_name": current_user.full_name,
        })
    except Exception as err:
        print(f"Warning: Failed to broadcast host profile WS event: {err}")

    return {"message": "Host profile updated successfully"}


@router.put("/profile/guest")
def update_guest_profile(profile_data: GuestProfileBase, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.user_type != UserType.GUEST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a guest")

    profile = current_user.guest_profile
    if not profile:
        profile = GuestProfile(user_id=current_user.id)
        current_user.guest_profile = profile

    dump_data = profile_data.model_dump()
    for key, value in dump_data.items():
        setattr(profile, key, value)

    embed_text = " ".join(filter(None, [profile.unit_description, profile.food_allergies, profile.food_preferences, profile.religious_level, current_user.biography]))
    if embed_text:
        try:
            profile.preference_vector = AgentService.generate_embedding(embed_text)
        except Exception as err:
            print(f"Warning: Failed to generate preference embedding: {err}")

    db.add(profile)
    db.commit()
    db.refresh(profile)
    db.refresh(current_user)
    return {"message": "Guest profile updated successfully"}