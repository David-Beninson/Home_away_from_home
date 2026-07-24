import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Enum, ForeignKey, String, Float, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database.base import Base

class VerificationType(str, enum.Enum):
    LONE_SOLDIER = "lone_soldier"
    CIVILIAN = "civilian"
    NEW_IMMIGRANT = "new_immigrant"

class VerificationStatus(str, enum.Enum):
    PENDING_AI = "pending_ai"
    PENDING_ADMIN = "pending_admin"
    APPROVED = "approved"
    REJECTED = "rejected"

class VerificationRequest(Base):
    """User moderation and document verification request."""
    __tablename__ = "verification_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    selfie_image_path: Mapped[str] = mapped_column(String(512), default="")
    document_image_path: Mapped[str] = mapped_column(String(512), default="")
    selfie_image_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_image_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_type: Mapped[VerificationType] = mapped_column(
        Enum(VerificationType, native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        default=VerificationType.CIVILIAN,
    )
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, native_enum=False, values_callable=lambda obj: [e.value for e in obj]),
        default=VerificationStatus.PENDING_AI,
    )
    ai_confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="verification_requests")
