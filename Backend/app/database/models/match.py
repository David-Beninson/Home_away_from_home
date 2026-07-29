import enum
import uuid
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database.base import Base

class MatchStatus(str, enum.Enum):
    """Status of a host-guest match transaction."""
    PENDING = "pending"
    MATCHED = "matched"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class Match(Base):
    """Links a GuestPost to a HostProfile; tracks the acceptance lifecycle."""
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    guest_post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("guest_posts.id", ondelete="CASCADE"), index=True
    )
    host_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("host_profiles.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus, native_enum=True), default=MatchStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    guest_post: Mapped["GuestPost"] = relationship(back_populates="matches")
    host_profile: Mapped["HostProfile"] = relationship()
    messages: Mapped[list["Message"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
