import enum
from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class PlatformType(str, enum.Enum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"


class ConnectionType(str, enum.Enum):
    OAUTH = "OAUTH"
    CHANNEL_ID = "CHANNEL_ID"


class SyncStatus(str, enum.Enum):
    IDLE = "idle"
    SYNCING = "syncing"
    SUCCESS = "success"
    ERROR = "error"


class SocialAccount(Base):
    """
    SocialAccount ORM Model.
    Generic table for storing connected platform credentials, channel details, and status.
    Designed so YouTube, Instagram, Facebook, LinkedIn, and Twitter can share this exact structure.
    """
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(Enum(PlatformType), nullable=False)
    connection_type = Column(String(50), default="CHANNEL_ID", nullable=True)
    channel_id = Column(String(255), nullable=True)
    channel_name = Column(String(255), nullable=True)
    channel_handle = Column(String(255), nullable=True)
    profile_image = Column(String(2000), nullable=True)
    status = Column(String(50), default="Connected", nullable=True)
    connected_at = Column(DateTime(timezone=True), nullable=True)

    platform_user_id = Column(String(255), nullable=True)
    platform_username = Column(String(255), nullable=False)
    avatar_url = Column(String(2000), nullable=True)
    followers_count = Column(BigInteger, nullable=True)
    following_count = Column(BigInteger, nullable=True)
    total_views = Column(BigInteger, nullable=True)
    content_count = Column(BigInteger, nullable=True)
    country = Column(String(255), nullable=True)
    category = Column(String(255), nullable=True)
    description = Column(String(2000), nullable=True)
    website = Column(String(500), nullable=True)
    verified = Column(Boolean, default=False, nullable=True)
    access_token = Column(String(1000), nullable=True)
    refresh_token = Column(String(1000), nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_connected = Column(Boolean, default=True, nullable=False)
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.IDLE, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


    # Relationships
    content_items = relationship("ContentItem", back_populates="social_account", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<SocialAccount id={self.id} user_id={self.user_id} platform={self.platform} username={self.platform_username}>"
