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
    hosting_date: datetime
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int

class ChatReadRequest(BaseModel):
    match_id: uuid.UUID
