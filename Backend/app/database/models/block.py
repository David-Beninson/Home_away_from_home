import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database.base import Base

class HostGuestBlock(Base):
    """Stores permanent blocks established by a host against a specific guest."""
    __tablename__ = "host_guest_blocks"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    host_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("host_profiles.id", ondelete="CASCADE"), index=True
    )
    guest_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("guest_profiles.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now()
    )

    host_profile: Mapped["HostProfile"] = relationship()
    guest_profile: Mapped["GuestProfile"] = relationship()
