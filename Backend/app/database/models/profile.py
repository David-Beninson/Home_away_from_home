import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, text
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.database.base import Base

class KashrutLevel(str, enum.Enum):
    """Kashrut observance levels used by hosts and guests."""
    NONE = "none"
    BASIC = "basic"
    KOSHER = "kosher"
    GLATT_MEHADRIN = "glatt_mehadrin"

class HostProfile(Base):
    """Extended host details: location, kashrut, availability, and atmosphere embedding."""
    __tablename__ = "host_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    
    # --- NEW QUESTIONNAIRE FIELDS ---
    residential_address: Mapped[Optional[str]]

    @hybrid_property
    def city(self) -> Optional[str]:
        return self.residential_address

    @city.expression
    def city(cls):
        return cls.residential_address
    max_guests: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    neighborhood_type: Mapped[Optional[str]]
    kashrut_level: Mapped[KashrutLevel] = mapped_column(
        default=KashrutLevel.KOSHER, server_default=text("'KOSHER'")
    )
    num_beds: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    num_bedrooms: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    pets_description: Mapped[Optional[str]]
    housing_type: Mapped[Optional[str]]
    accessibility_level: Mapped[Optional[str]]

    # --- PRESERVED SYSTEM FIELDS ---
    availability_windows: Mapped[Optional[str]]
    atmosphere_vector: Mapped[Optional[List[float]]] = mapped_column(Vector(1536))
    emergency_available: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    available_spots: Mapped[int] = mapped_column(default=3, server_default=text("3"))
    has_lodging: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    image_url: Mapped[Optional[str]]
    vibe_tags: Mapped[Optional[str]]

    # Relationships
    user: Mapped["User"] = relationship(back_populates="host_profile")
    listings: Mapped[List["HostListing"]] = relationship(
        back_populates="host_profile", cascade="all, delete-orphan"
    )

class GuestProfile(Base):
    """Guest identity flags, preferences, and semantic preference embedding."""
    __tablename__ = "guest_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # --- NEW QUESTIONNAIRE FIELDS ---
    service_type: Mapped[Optional[str]] = mapped_column(default="סדיר")
    unit_description: Mapped[Optional[str]]
    release_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_anonymous: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    giving_to_host: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    food_allergies: Mapped[Optional[str]]
    food_preferences: Mapped[Optional[str]]
    religious_level: Mapped[Optional[str]]
    kosher_food: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    gender: Mapped[Optional[str]]
    guest_address: Mapped[Optional[str]]
    # Legacy field used by admin moderation and verification flows
    is_soldier_or_national_service: Mapped[bool] = mapped_column(default=False, server_default=text("false"))

    # --- PRESERVED SYSTEM FIELDS ---
    preference_vector: Mapped[Optional[List[float]]] = mapped_column(Vector(1536))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="guest_profile")
    posts: Mapped[List["GuestPost"]] = relationship(
        back_populates="guest_profile", cascade="all, delete-orphan"
    )