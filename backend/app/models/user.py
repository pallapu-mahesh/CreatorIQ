import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.sql import func

from app.db.database import Base


class UserRole(str, enum.Enum):
    """Supported user roles for Role-Based Access Control."""
    CREATOR = "creator"
    AGENCY = "agency"
    MARKETING = "marketing"
    ADMIN = "admin"


class User(Base):
    """
    User ORM model.

    Stores core identity and authentication data.
    Analytics and social connections are stored separately
    to keep this model lean and focused.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(
        Enum(UserRole),
        default=UserRole.CREATOR,
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    avatar_url = Column(Text, nullable=True)
    theme = Column(String(20), default="light", nullable=True)
    language = Column(String(10), default="en", nullable=True)
    default_dashboard = Column(String(100), default="/dashboard", nullable=True)
    auth_provider = Column(String(20), default="email", nullable=True)
    token_version = Column(Integer, default=0, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
