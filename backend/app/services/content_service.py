from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.models.content_item import ContentItem
from app.models.social_account import SocialAccount
from app.schemas.analytics import (
    ContentKPIOut,
    ContentTrendPoint,
    ContentTrendSeriesOut,
)


class ContentService:
    """
    Service layer for Content Analytics business logic.
    Decoupled from FastAPI routers to ensure modularity, reusable SQL queries, and clean testing.
    """

    def get_active_account_for_user(
        self, db: Session, user_id: int, social_account_id: Optional[int] = None
    ) -> Optional[SocialAccount]:
        """Fetch active social account for user if available."""
        query = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.is_connected == True,
        )
        if social_account_id:
            query = query.filter(SocialAccount.id == social_account_id)
        return query.order_by(desc(SocialAccount.last_synced_at)).first()

    def get_content_items(
        self,
        db: Session,
        user_id: int,
        social_account_id: Optional[int] = None,
        platform: Optional[str] = None,
        content_type: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "newest",
        date_range: Optional[str] = "all",
    ) -> List[ContentItem]:
        """Fetch filtered and sorted content items for active social account or overall user."""
        query = db.query(ContentItem).filter(ContentItem.user_id == user_id)

        if social_account_id:
            query = query.filter(ContentItem.social_account_id == social_account_id)
        elif platform and platform.lower() != "all":
            query = query.filter(ContentItem.platform == platform.lower())

        if content_type and content_type.lower() != "all":
            query = query.filter(ContentItem.content_type == content_type.lower())

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(ContentItem.title.ilike(term))

        # Date Range Filter
        now = datetime.now(timezone.utc)
        if date_range == "7d":
            query = query.filter(ContentItem.published_at >= now - timedelta(days=7))
        elif date_range == "30d":
            query = query.filter(ContentItem.published_at >= now - timedelta(days=30))
        elif date_range == "90d":
            query = query.filter(ContentItem.published_at >= now - timedelta(days=90))
        elif date_range == "1y":
            query = query.filter(ContentItem.published_at >= now - timedelta(days=365))

        # Sort Ordering
        if sort_by == "views":
            query = query.order_by(desc(ContentItem.views))
        elif sort_by == "likes":
            query = query.order_by(desc(ContentItem.likes))
        elif sort_by == "comments":
            query = query.order_by(desc(ContentItem.comments))
        elif sort_by == "engagement_rate":
            query = query.order_by(desc(ContentItem.engagement_rate))
        elif sort_by == "oldest":
            query = query.order_by(asc(ContentItem.published_at))
        else:
            query = query.order_by(desc(ContentItem.published_at))

        return query.all()

    def get_content_kpis(
        self,
        db: Session,
        user_id: int,
        social_account_id: Optional[int] = None,
        platform: Optional[str] = None,
        date_range: Optional[str] = "all",
    ) -> ContentKPIOut:
        """Calculate aggregated KPI metrics summary with real period-over-period change percentages."""
        items = self.get_content_items(
            db=db,
            user_id=user_id,
            social_account_id=social_account_id,
            platform=platform,
            date_range=date_range,
        )

        if not items:
            return ContentKPIOut(
                total_views=0,
                total_likes=0,
                total_comments=0,
                total_shares=0,
                total_saves=None,
                total_reach=None,
                avg_engagement_rate=0.0,
                total_watch_time_hours=0.0,
                total_content_count=0,
                views_change_pct=0.0,
                likes_change_pct=0.0,
                comments_change_pct=0.0,
                shares_change_pct=0.0,
                saves_change_pct=None,
                watch_time_change_pct=0.0,
                reach_change_pct=None,
                engagement_change_pct=0.0,
            )

        t_views = sum(i.views or 0 for i in items)
        t_likes = sum(i.likes or 0 for i in items)
        t_comments = sum(i.comments or 0 for i in items)
        t_shares = sum(i.shares or 0 for i in items)
        t_watch_min = sum(i.watch_time_minutes or 0.0 for i in items)
        avg_eng = round(sum(i.engagement_rate or 0.0 for i in items) / len(items), 2)

        has_saves = any(i.saves is not None for i in items)
        t_saves = sum(i.saves for i in items if i.saves is not None) if has_saves else None

        has_reach = any(i.reach is not None for i in items)
        t_reach = sum(i.reach for i in items if i.reach is not None) if has_reach else None

        now = datetime.now(timezone.utc)
        span_days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(date_range or "all")
        prev = None
        if span_days:
            prev = self._aggregate(
                db=db,
                user_id=user_id,
                social_account_id=social_account_id,
                platform=platform,
                start=now - timedelta(days=2 * span_days),
                end=now - timedelta(days=span_days),
            )

        def _pct(cur: float, past: Optional[float]) -> float:
            if past:
                return round((cur - past) / past * 100.0, 1)
            return 0.0

        return ContentKPIOut(
            total_views=t_views,
            total_likes=t_likes,
            total_comments=t_comments,
            total_shares=t_shares,
            total_saves=t_saves,
            total_reach=t_reach,
            avg_engagement_rate=avg_eng,
            total_watch_time_hours=round(t_watch_min / 60.0, 1),
            total_content_count=len(items),
            views_change_pct=_pct(t_views, prev["views"] if prev else 0),
            likes_change_pct=_pct(t_likes, prev["likes"] if prev else 0),
            comments_change_pct=_pct(t_comments, prev["comments"] if prev else 0),
            shares_change_pct=_pct(t_shares, prev["shares"] if prev else 0),
            saves_change_pct=_pct(t_saves or 0, prev["saves"] if prev else 0) if has_saves else None,
            watch_time_change_pct=_pct(t_watch_min, prev["watch_min"] if prev else 0),
            reach_change_pct=_pct(t_reach or 0, prev["reach"] if prev else 0) if has_reach else None,
            engagement_change_pct=_pct(avg_eng, prev["eng"] if prev else 0),
        )

    def _aggregate(
        self,
        db: Session,
        user_id: int,
        social_account_id: Optional[int],
        platform: Optional[str],
        start: datetime,
        end: datetime,
    ) -> Dict[str, float]:
        """Aggregate totals for a bounded time window for real change computations."""
        query = db.query(ContentItem).filter(
            ContentItem.user_id == user_id,
            ContentItem.published_at >= start,
            ContentItem.published_at < end,
        )
        if social_account_id:
            query = query.filter(ContentItem.social_account_id == social_account_id)
        elif platform and platform.lower() != "all":
            query = query.filter(ContentItem.platform == platform.lower())

        items = query.all()
        return {
            "views": sum(i.views or 0 for i in items),
            "likes": sum(i.likes or 0 for i in items),
            "comments": sum(i.comments or 0 for i in items),
            "shares": sum(i.shares or 0 for i in items),
            "saves": sum(i.saves for i in items if i.saves is not None),
            "watch_min": sum(i.watch_time_minutes or 0.0 for i in items),
            "reach": sum(i.reach for i in items if i.reach is not None),
            "eng": round(sum(i.engagement_rate or 0.0 for i in items) / len(items), 2) if items else 0.0,
        }

    def get_content_trends(
        self,
        db: Session,
        user_id: int,
        social_account_id: Optional[int] = None,
        platform: Optional[str] = None,
        timeframe: Optional[str] = "30d",
    ) -> ContentTrendSeriesOut:
        """Generate time-series trend points for Recharts visualizations."""
        items = self.get_content_items(
            db=db,
            user_id=user_id,
            social_account_id=social_account_id,
            platform=platform,
            date_range=timeframe,
            sort_by="oldest",
        )

        points: List[ContentTrendPoint] = []
        for i in items:
            date_str = i.published_at.strftime("%Y-%m-%d") if i.published_at else "Unknown"
            points.append(
                ContentTrendPoint(
                    date=date_str,
                    views=i.views,
                    likes=i.likes,
                    comments=i.comments,
                    shares=i.shares,
                    watch_time_hours=round(i.watch_time_minutes / 60.0, 2),
                    reach=None,
                    engagement_rate=i.engagement_rate,
                )
            )

        return ContentTrendSeriesOut(timeframe=timeframe or "30d", points=points)

    def compare_content(
        self, db: Session, user_id: int, content_ids: List[int]
    ) -> List[ContentItem]:
        """Fetch specified content items side-by-side for comparison."""
        return (
            db.query(ContentItem)
            .filter(
                ContentItem.user_id == user_id,
                ContentItem.id.in_(content_ids),
            )
            .all()
        )


content_service = ContentService()
