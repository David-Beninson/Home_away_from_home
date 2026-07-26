import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.database.models.post import PostStatus

class GuestPostBase(BaseModel):
    requested_date: datetime
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    nights_count: Optional[int] = None
    description: str
    guests_count: int = 1
    is_anonymous: Optional[bool] = True

class GuestPostCreate(GuestPostBase):
    pass

class GuestPostUpdate(BaseModel):
    requested_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    nights_count: Optional[int] = None
    description: Optional[str] = None
    guests_count: Optional[int] = None
    is_anonymous: Optional[bool] = None


class GuestPostResponse(GuestPostBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    guest_profile_id: uuid.UUID
    status: PostStatus
    is_urgent: bool
    created_at: datetime
    guest_name: str
    unit_name: Optional[str] = None
    is_anonymous: bool = True
    is_direct_request: bool = False
    claimed_by_host_id: Optional[uuid.UUID] = None
    claimed_by_host_name: Optional[str] = None
    claimed_by_host_city: Optional[str] = None
    pending_match_id: Optional[uuid.UUID] = None


