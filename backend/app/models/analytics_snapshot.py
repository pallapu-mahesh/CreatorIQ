from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class AnalyticsSnapshot(Base):
    """
    AnalyticsSnapshot ORM Model.
    Stores daily aggregated historical performance metrics per platform for time-series charts.
    """
    __tablename__ = "analytics_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    
    followers_count = Column(Integer, default=0, nullable=False)
    total_views = Column(Integer, default=0, nullable=False)
    total_engagement = Column(Float, default=0.0, nullable=False)
    total_revenue = Column(Float, default=0.0, nullable=False)
    watch_time_hours = Column(Float, default=0.0, nullable=False)

    def __repr__(self) -> str:
        return f"<AnalyticsSnapshot date={self.date} platform={self.platform} followers={self.followers_count}>"
