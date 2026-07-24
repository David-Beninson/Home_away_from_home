import uuid
import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from app.database.models.profile import KashrutLevel
from app.database.models.user import UserType

def normalize_israeli_phone_number(v: str) -> str:
    cleaned = re.sub(r"[\s\-\(\)]", "", v)
    pattern = r"^(05\d{8}|\+9725\d{8}|9725\d{8})$"
    if not re.match(pattern, cleaned):
        raise ValueError("Please enter a valid Israeli mobile phone number (e.g., 050-1234567)")
    if cleaned.startswith("05"):
        return "+972" + cleaned[1:]
    if cleaned.startswith("972"):
        return "+" + cleaned
    return cleaned

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: str
    user_type: UserType
    biography: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        return normalize_israeli_phone_number(v)

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must be >= 8 chars, contain an uppercase letter and a digit")
        return v

class OTPRequestSchema(BaseModel):
    phone_number: str
    email: EmailStr

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_israeli_phone_number(v)

class UserRegisterVerifySchema(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    password: str
    user_type: UserType
    otp_code: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_israeli_phone_number(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must be >= 8 chars, contain an uppercase letter and a digit")
        return v
        
class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime

class HostProfileBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    residential_address: Optional[str] = None
    max_guests: int = 1
    neighborhood_type: Optional[str] = None
    kashrut_level: Optional[str] = "כשר"
    num_beds: int = 1
    num_bedrooms: int = 1
    pets_description: Optional[str] = None
    housing_type: Optional[str] = None
    accessibility_level: Optional[str] = None

    @field_validator("kashrut_level", mode="before")
    @classmethod
    def validate_kashrut_level(cls, v):
        if not v:
            return "כשר"
        return v

class GuestProfileBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    service_type: Optional[str] = "סדיר"
    unit_description: Optional[str] = None
    release_date: Optional[datetime] = None
    is_anonymous: bool = False
    giving_to_host: bool = False
    food_allergies: Optional[str] = None
    food_preferences: Optional[str] = None
    religious_level: Optional[str] = None
    kosher_food: bool = True
    gender: Optional[str] = None
    guest_address: Optional[str] = None

    @field_validator("release_date", mode="before")
    @classmethod
    def validate_release_date(cls, v):
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v)
            except ValueError:
                return None
        return v

class LoginRequest(BaseModel):
    username: str
    password: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class VerifyPhoneRequest(BaseModel):
    phone_number: str
    code: str

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return normalize_israeli_phone_number(v)

class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    phone_number: Optional[str] = None
    full_name: str
    user_type: UserType
    verification_status: Optional[str] = "pending_submission"
    biography: Optional[str] = None
    is_email_verified: bool = False
    is_phone_verified: bool = False
    
    profile: Optional[dict] = None

    @model_validator(mode="before")
    @classmethod
    def extract_profile_data(cls, data):
        if not isinstance(data, dict) and hasattr(data, "__dict__"):
            u_type = getattr(data, "user_type", None)
            p = getattr(data, "host_profile", None) if u_type == UserType.HOST else getattr(data, "guest_profile", None)

            data_dict = {k: v for k, v in data.__dict__.items() if not k.startswith('_')}
            v_status = getattr(data, "verification_status", None)
            data_dict["verification_status"] = v_status.value if hasattr(v_status, "value") else str(v_status) if v_status else "pending_submission"
            
            if p and hasattr(p, "__dict__"):
                data_dict["profile"] = {k: v for k, v in p.__dict__.items() if not k.startswith('_')}
            else:
                data_dict["profile"] = None
                
            return data_dict
        return data