import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class ContentType(str, enum.Enum):
    VIDEO = "video"
    REEL = "reel"
    POST = "post"
    SHORT = "short"


class ContentItem(Base):
    """
    ContentItem ORM Model.
    Stores metadata and metrics for individual posts, videos, reels, and shorts across platforms.
    """
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    platform = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content_type = Column(Enum(ContentType), default=ContentType.VIDEO, nullable=False)
    external_id = Column(String(255), nullable=True)
    url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Engagement Metrics
    views = Column(Integer, default=0, nullable=False)
    likes = Column(Integer, default=0, nullable=False)
    comments = Column(Integer, default=0, nullable=False)
    shares = Column(Integer, default=0, nullable=False)
    saves = Column(Integer, nullable=True)
    reach = Column(Integer, nullable=True)
    watch_time_minutes = Column(Float, default=0.0, nullable=False)
    revenue = Column(Float, default=0.0, nullable=False)
    engagement_rate = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    social_account = relationship("SocialAccount", back_populates="content_items")

    def __repr__(self) -> str:
        return f"<ContentItem id={self.id} title={self.title[:20]} views={self.views}>"
