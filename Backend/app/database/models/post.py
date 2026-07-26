import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Enum, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database.base import Base

class PostStatus(str, enum.Enum):
    """Lifecycle state of a guest hosting request."""
    OPEN = "open"
    PENDING = "pending"
    MATCHED = "matched"

class GuestPost(Base):
    """A guest's active hosting request (reverse-auction style)."""
    __tablename__ = "guest_posts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    guest_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("guest_profiles.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, native_enum=True), default=PostStatus.OPEN
    )
    requested_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    nights_count: Mapped[Optional[int]] = mapped_column(nullable=True, default=1, server_default=text("1"))
    description: Mapped[str]
    guests_count: Mapped[int] = mapped_column(
        default=1, server_default=text("1")
    )
    is_anonymous: Mapped[bool] = mapped_column(
        default=True, server_default=text("true")
    )
    claimed_by_host_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("host_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_direct_request: Mapped[bool] = mapped_column(
        default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        server_default=func.now(),
    )

    guest_profile: Mapped["GuestProfile"] = relationship(back_populates="posts")
    claimed_by_host: Mapped[Optional["HostProfile"]] = relationship()
    matches: Mapped[list["Match"]] = relationship(
        back_populates="guest_post", cascade="all, delete-orphan"
    )

    @property
    def is_urgent(self) -> bool:
        from datetime import datetime, timezone
        if self.status != PostStatus.OPEN:
            return False
        delta = self.requested_date - datetime.now(timezone.utc)
        return 0 <= delta.total_seconds() < 86400

    @property
    def guest_name(self) -> str:
        if getattr(self, 'is_anonymous', False) or (self.guest_profile and getattr(self.guest_profile, 'is_anonymous', False)):
            return "אנונימי"
        if self.guest_profile and self.guest_profile.user:
            return self.guest_profile.user.full_name
        return "אנונימי"

    @property
    def unit_name(self) -> Optional[str]:
        if getattr(self, 'is_anonymous', False):
            return None
        if self.guest_profile and not self.guest_profile.is_anonymous:
            return self.guest_profile.unit_name
        return None

    @property
    def claimed_by_host_name(self) -> Optional[str]:
        if self.claimed_by_host and self.claimed_by_host.user:
            return self.claimed_by_host.user.full_name
        return None

    @property
    def claimed_by_host_city(self) -> Optional[str]:
        if self.claimed_by_host:
            return self.claimed_by_host.city
        return None

    @property
    def pending_match_id(self) -> Optional[uuid.UUID]:
        from app.database.models.match import MatchStatus
        for m in self.matches:
            if m.status == MatchStatus.PENDING and m.host_profile_id == self.claimed_by_host_id:
                return m.id
        return None


