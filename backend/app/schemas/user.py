from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole


# --------------------------------------------------
# Request Schemas
# --------------------------------------------------

class UserCreate(BaseModel):
    """Schema for new user registration."""
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.CREATOR

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name must not be empty.")
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class UserLogin(BaseModel):
    """Schema for user login credentials."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for the authenticated user updating their own profile."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    avatar_url: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    default_dashboard: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def name_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Full name must not be empty.")
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v

    @field_validator("avatar_url")
    @classmethod
    def avatar_must_not_be_huge(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if len(v) > 5_000_000:
            raise ValueError("Profile image is too large.")
        return v


class GoogleOAuthLogin(BaseModel):
    """Schema for Google OAuth 2.0 authorization code sign-in requests."""
    code: str
    redirect_uri: str



# --------------------------------------------------
# Response Schemas
# --------------------------------------------------

class UserOut(BaseModel):
    """Safe user representation returned in API responses (no password)."""
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    default_dashboard: Optional[str] = None
    auth_provider: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChangePassword(BaseModel):
    """Schema for changing the authenticated user's password."""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenData(BaseModel):
    """Internal schema for decoded JWT payload."""
    email: Optional[str] = None
