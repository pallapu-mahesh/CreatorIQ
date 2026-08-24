from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.content_item import ContentItem
from app.models.social_account import SocialAccount
from app.schemas.analytics import (
    AudienceOverviewOut,
    AudienceDemographicsOut,
    AudienceActivityOut,
    AudienceReachOut,
    AudienceEngagementInsightsOut,
    FollowerGrowthPoint,
)


class AudienceService:
    """
    Service layer for Audience Analytics business logic.
    Decoupled from FastAPI routers to ensure modularity, reusable SQL queries, and clean testing.
    Supports YouTube, Instagram, Facebook, LinkedIn, X (Twitter).
    Enforces real data metrics and explicit None / Empty indicators for API-restricted public metrics.
    """

    def get_audience_overview(
        self,
        db: Session,
        user_id: int,
        social_account_id: Optional[int] = None,
        platform: Optional[str] = None,
        channel_id: Optional[str] = None,
    ) -> AudienceOverviewOut:
        """Calculate audience overview metrics for user or specific social account."""
        query = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.is_connected == True,
        )
        if social_account_id:
            query = query.filter(SocialAccount.id == social_account_id)
        if platform:
            query = query.filter(SocialAccount.platform == platform)

        account = query.order_by(desc(SocialAccount.last_synced_at)).first()
        subscribers = getattr(account, "followers_count", None) or 0 if account else 0

        # Query content items for user
        items_query = db.query(ContentItem).filter(ContentItem.user_id == user_id)
        if platform:
            items_query = items_query.filter(ContentItem.platform == platform)
        items = items_query.all()

        t_views = sum(i.views or 0 for i in items)
        t_likes = sum(i.likes or 0 for i in items)
        t_comments = sum(i.comments or 0 for i in items)
        avg_eng = round(((t_likes + t_comments) / t_views * 100), 2) if t_views > 0 else 0.0

        return AudienceOverviewOut(
            total_followers=subscribers,
            new_followers=None,  # Available after platform OAuth reporting support
            monthly_follower_growth_pct=None,  # Available after platform OAuth reporting support
            audience_reach=None,  # Restricted on public YouTube API v3
            impressions=None,  # Restricted on public YouTube API v3
            avg_engagement_rate=avg_eng,
        )

    def get_audience_demographics(
        self,
        db: Session,
        user_id: int,
        social_account_id: Optional[int] = None,
        platform: Optional[str] = None,
    ) -> AudienceDemographicsOut:
        """
        Retrieve demographic breakdown.
        YouTube Data API v3 public endpoints do not expose Age, Gender, or Device usage without private YouTube Analytics OAuth scope.
        Exposes country if available from connected account.
        """
        top_countries = []
        account = (
            db.query(SocialAccount)
            .filter(SocialAccount.user_id == user_id, SocialAccount.is_connected == True)
            .first()
        )
        if account and hasattr(account, "country") and account.country:
            top_countries.append({"country": account.country, "percentage": 100.0, "count": account.followers_count or 0})

        return AudienceDemographicsOut(
            age_distribution=[],  # Available after platform support
            gender_distribution=[],  # Available after platform support
            top_countries=top_countries,
            device_usage=[],  # Available after platform support
            active_hours=[],  # Available after platform support
        )

    def get_audience_activity(
        self,
        db: Session,
        user_id: int,
        platform: Optional[str] = None,
    ) -> AudienceActivityOut:
        """Calculate audience activity patterns from actual published content engagement trends."""
        items = db.query(ContentItem).filter(ContentItem.user_id == user_id).all()

        day_stats: Dict[str, List[float]] = {
            "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [], "Sunday": []
        }
        days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for item in items:
            if item.published_at:
                day_name = item.published_at.strftime("%A")
                eng = item.engagement_rate or 0.0
                if day_name in day_stats:
                    day_stats[day_name].append(eng)

        most_active_days = []
        max_avg_day = None
        max_avg_val = -1.0

        for day in days_order:
            rates = day_stats[day]
            avg_rate = round(sum(rates) / len(rates), 2) if rates else 0.0
            most_active_days.append({"day": day, "activity_pct": avg_rate})
            if avg_rate > max_avg_val and rates:
                max_avg_val = avg_rate
                max_avg_day = day

        peak_time = f"{max_avg_day} (based on top performing content)" if max_avg_day else None

        return AudienceActivityOut(
            most_active_hours=[],  # Available after platform support
            most_active_days=most_active_days,
            peak_engagement_time=peak_time,
            activity_trends=most_active_days,
        )

    def get_audience_reach(
        self, db: Session, user_id: int
    ) -> AudienceReachOut:
        """Retrieve reach and impression insights (returns None for unsupported public API metrics)."""
        return AudienceReachOut(
            total_reach=None,
            total_impressions=None,
            unique_viewers=None,
            reach_trend=[],
            impression_trend=[],
        )

    def get_audience_engagement(
        self, db: Session, user_id: int, platform: Optional[str] = None
    ) -> AudienceEngagementInsightsOut:
        """Retrieve aggregated engagement metrics across published content."""
        query = db.query(ContentItem).filter(ContentItem.user_id == user_id)
        if platform:
            query = query.filter(ContentItem.platform == platform)
        items = query.order_by(ContentItem.published_at.desc()).all()

        t_likes = sum(i.likes or 0 for i in items)
        t_comments = sum(i.comments or 0 for i in items)
        t_shares = sum(i.shares or 0 for i in items)
        t_views = sum(i.views or 0 for i in items)

        avg_eng = round(((t_likes + t_comments + t_shares) / t_views * 100), 2) if t_views > 0 else 0.0

        trends = []
        for i in items[:15]:
            trends.append({
                "date": i.published_at.strftime("%b %d") if i.published_at else "N/A",
                "title": i.title[:20] + "..." if len(i.title) > 20 else i.title,
                "likes": i.likes or 0,
                "comments": i.comments or 0,
                "shares": i.shares or 0,
                "views": i.views or 0,
                "engagement_rate": i.engagement_rate or 0.0,
            })

        return AudienceEngagementInsightsOut(
            total_likes=t_likes,
            total_comments=t_comments,
            total_shares=t_shares if t_shares > 0 else None,
            total_saves=None,  # YouTube does not support Saves metric
            avg_engagement_rate=avg_eng,
            interaction_trends=trends,
        )


audience_service = AudienceService()
