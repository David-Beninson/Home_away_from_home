import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, computed_field
class HostListingBase(BaseModel):
    title: str
    description: str
    max_guests: int = 1
    notes: Optional[str] = None
class HostListingCreate(HostListingBase):
    pass

class HostListingResponse(HostListingBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    host_profile_id: uuid.UUID

class KashrutOptionResponse(BaseModel):
    value: str
    label: str

class UserSimpleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    full_name: str
    email: str
    phone_number: str

class HostSearchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    kashrut_level: str
    religious_orientation: Optional[str] = None
    availability_windows: Optional[str] = None
    emergency_available: Optional[bool] = False
    max_guests: Optional[int] = 1
    available_spots: Optional[int] = 3
    has_lodging: Optional[bool] = True
    image_url: Optional[str] = None
    free_text_notes: Optional[str] = None
    vibe_tags: Optional[List[str]] = []
    has_pets: Optional[bool] = False
    match_score: Optional[int] = None
    upcoming_open_dates: Optional[List[str]] = []
    upcoming_open_days: Optional[List[str]] = []
    is_available_this_week: Optional[bool] = True
    user: Optional[UserSimpleResponse] = None

    @computed_field
    @property
    def host_name(self) -> str:
        if self.user and self.user.full_name:
            return self.user.full_name
        return "מארח ללא שם"
