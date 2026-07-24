import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.database.models.verification import VerificationType, VerificationStatus
from app.database.models.user import UserVerificationStatus

class VerificationStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_verification_status: UserVerificationStatus
    request_id: Optional[uuid.UUID] = None
    verification_type: Optional[VerificationType] = None
    status: Optional[VerificationStatus] = None
    ai_confidence_score: Optional[float] = None
    rejection_reason: Optional[str] = None
    updated_at: Optional[datetime] = None

class VerificationSubmitResponse(BaseModel):
    message: str
    request_id: uuid.UUID
    status: VerificationStatus
    user_verification_status: UserVerificationStatus
    ai_confidence_score: float

class SupportMessageCreate(BaseModel):
    content: str
    target_user_id: Optional[uuid.UUID] = None

class SupportMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: Optional[str] = None
    content: str
    created_at: datetime
