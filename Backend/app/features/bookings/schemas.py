import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.database.models.match import MatchStatus

from datetime import datetime

class BookingRequestCreate(BaseModel):
    host_profile_id: uuid.UUID
    guest_post_id: Optional[uuid.UUID] = None
    requested_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    nights_count: Optional[int] = None
    description: Optional[str] = None
    guests_count: Optional[int] = 1

class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    guest_post_id: uuid.UUID
    host_profile_id: uuid.UUID
    status: MatchStatus

class MatchStatusUpdate(BaseModel):
    status: MatchStatus
