import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class MessageCreate(BaseModel):
    """Schema to receive new messages via REST API or payload validation."""
    content: str

class MessageResponse(BaseModel):
    """Schema to return messages to the client."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    match_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    created_at: datetime
    is_read: bool

class ChatPreviewResponse(BaseModel):
    match_id: uuid.UUID
    other_party_name: str
    other_party_avatar: Optional[str] = None
    other_party_phone: Optional[str] = None
    phone_number: Optional[str] = None
    hosting_date: Optional[datetime] = None
    shabbat_date: Optional[datetime] = None
    requested_date: Optional[datetime] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int
    is_anonymous: Optional[bool] = False
    status: Optional[str] = None

class ChatReadRequest(BaseModel):
    match_id: uuid.UUID
