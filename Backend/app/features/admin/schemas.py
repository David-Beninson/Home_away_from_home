import uuid
from datetime import datetime
from typing import List, Union, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, computed_field
from app.database.models.user import UserType

class ORMResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class AdminUserResponse(ORMResponse):
    id: Union[uuid.UUID, str]
    email: EmailStr
    full_name: str
    phone_number: str
    user_type: UserType
    is_active: bool
    created_at: Optional[datetime] = None
    biography: Optional[str] = None

    # פותר לנו את הצורך בלוגיקה ידנית ב-Router
    @computed_field
    @property
    def is_soldier_or_national_service(self) -> bool:
        if self.user_type == UserType.GUEST and hasattr(self, "guest_profile") and self.guest_profile:
            return getattr(self.guest_profile, "is_soldier_or_national_service", False)
        return False

class CityStat(BaseModel):
    city: str
    count: int

class KashrutStat(BaseModel):
    level: str
    count: int

class AdminStatsResponse(BaseModel):
    total_hosts: int
    total_guests: int
    total_soldiers: int = 0
    active_matches: int
    pending_matches: int = 0
    open_posts: int
    urgent_posts: int
    total_posts: int = 0
    match_rate_percentage: float = 0.0
    cities_breakdown: List[CityStat] = []
    kashrut_breakdown: List[KashrutStat] = []

class UserStatusUpdateRequest(BaseModel):
    is_active: bool

class GuestVerifyUpdateRequest(BaseModel):
    is_soldier_or_national_service: bool

class PostModerationResponse(ORMResponse):
    id: Union[uuid.UUID, str]
    guest_name: str
    status: str
    requested_date: datetime
    description: str
    guests_count: int
    created_at: datetime
    is_urgent: bool

    @computed_field
    @property
    def guest_phone(self) -> Optional[str]:
        if getattr(self, "guest_profile", None) and getattr(self.guest_profile, "user", None):
            return self.guest_profile.user.phone_number
        return None

    @computed_field
    @property
    def phone_number(self) -> Optional[str]:
        return self.guest_phone

class MatchModerationResponse(ORMResponse):
    id: Union[uuid.UUID, str]
    guest_post_id: Union[uuid.UUID, str]
    status: str
    created_at: datetime
    updated_at: datetime

    # שליפה אוטומטית מתוך היחסים (Relationships) של ה-Model
    @computed_field
    @property
    def guest_name(self) -> str:
        return self.guest_post.guest_name if getattr(self, "guest_post", None) else "Unknown Guest"

    @computed_field
    @property
    def host_name(self) -> str:
        if getattr(self, "host_profile", None) and getattr(self.host_profile, "user", None):
            return self.host_profile.user.full_name
        return "Unknown Host"

    @computed_field
    @property
    def host_phone(self) -> Optional[str]:
        if getattr(self, "host_profile", None) and getattr(self.host_profile, "user", None):
            return self.host_profile.user.phone_number
        return None

    @computed_field
    @property
    def guest_phone(self) -> Optional[str]:
        if getattr(self, "guest_post", None) and getattr(self.guest_post, "guest_profile", None) and getattr(self.guest_post.guest_profile, "user", None):
            return self.guest_post.guest_profile.user.phone_number
        return None

    @computed_field
    @property
    def requested_date(self) -> datetime:
        return self.guest_post.requested_date if getattr(self, "guest_post", None) else self.created_at

class AdminBookingsResponse(ORMResponse):
    matches: List[MatchModerationResponse]
    posts: List[PostModerationResponse]

class VerificationRejectRequest(BaseModel):
    rejection_reason: str
