import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Enum, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database.base import Base

class UserType(str, enum.Enum):
    """System user roles."""
    HOST = "host"
    GUEST = "guest"
    ADMIN = "admin"

class UserVerificationStatus(str, enum.Enum):
    """User account verification lifecycle status."""
    PENDING_SUBMISSION = "pending_submission"
    PENDING_AI = "pending_ai"
    PENDING_ADMIN = "pending_admin"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class User(Base):
    """Core credentials and identity for every system user."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(unique=True, index=True)
    phone_number: Mapped[str] = mapped_column(unique=True, index=True)
    full_name: Mapped[str]
    hashed_password: Mapped[str]
    user_type: Mapped[UserType] = mapped_column(Enum(UserType, native_enum=True))
    verification_status: Mapped[UserVerificationStatus] = mapped_column(
        Enum(UserVerificationStatus, native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        default=UserVerificationStatus.PENDING_SUBMISSION,
        server_default=text("'pending_submission'"),
    )
    is_active: Mapped[bool] = mapped_column(
        default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        server_default=func.now(),
    )
    biography: Mapped[Optional[str]]
    is_email_verified: Mapped[bool] = mapped_column(
        default=False, server_default=text("false")
    )
    email_verification_code: Mapped[Optional[str]] = mapped_column(nullable=True)
    email_verification_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_phone_verified: Mapped[bool] = mapped_column(
        default=False, server_default=text("false")
    )
    telegram_verification_code: Mapped[Optional[str]] = mapped_column(nullable=True)
    telegram_verification_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(nullable=True)

    host_profile: Mapped["HostProfile"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    guest_profile: Mapped["GuestProfile"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    verification_requests: Mapped[list["VerificationRequest"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
