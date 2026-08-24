from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.content_item import ContentItem
from app.models.social_account import SocialAccount
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.schemas.analytics import (
    GrowthTrendOut,
    HashtagTrend,
    CategoryTrendOut,
    ContentGrowthItemOut,
    ReachPredictionOut,
    AudienceForecastOut,
    GrowthInsightOut,
    FullGrowthAnalysisOut,
)

router = APIRouter(prefix="/api/trends", tags=["Growth & Trend Analysis"])


def _real_follower_counts(db: Session, user_id: int) -> Dict[str, int]:
    """Map of platform -> real follower count from connected accounts."""
    accounts = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == user_id, SocialAccount.is_connected == True)
        .all()
    )
    return {a.platform.value: (a.followers_count or 0) for a in accounts}


@router.get("/growth", response_model=GrowthTrendOut)
def get_growth_trends(
    platform: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve historical & projected growth trends and reach forecasts from real snapshots."""
    snapshots = (
        db.query(AnalyticsSnapshot)
        .filter(AnalyticsSnapshot.user_id == current_user.id)
        .order_by(AnalyticsSnapshot.date.asc())
        .all()
    )

    if not snapshots:
        return GrowthTrendOut(
            historical=[],
            forecast=[],
            total_growth_rate=0.0,
            projected_reach=0,
        )

    by_date: Dict[str, Dict[str, Any]] = {}
    for s in snapshots:
        d_key = s.date.strftime("%Y-%m-%d")
        if d_key not in by_date:
            by_date[d_key] = {"date": s.date.strftime("%b %d"), "views": 0, "reach": None}
        by_date[d_key]["views"] += s.total_views or 0

    historical_points = [by_date[k] for k in sorted(by_date.keys())][-14:]

    first_followers = 0
    last_followers = 0
    for s in snapshots:
        if first_followers == 0 and (s.followers_count or 0) > 0:
            first_followers = s.followers_count
        if s.followers_count:
            last_followers = s.followers_count
    growth_rate = round(((last_followers - first_followers) / first_followers * 100.0), 1) if first_followers else 0.0

    return GrowthTrendOut(
        historical=historical_points,
        forecast=[],
        total_growth_rate=growth_rate,
        projected_reach=0,
    )


@router.get("/hashtags", response_model=List[HashtagTrend])
def get_hashtag_trends(
    platform: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve hashtag performance analytics & trend ranking from real content metadata."""
    items = (
        db.query(ContentItem)
        .filter(ContentItem.user_id == current_user.id)
        .all()
    )
    hashtag_stats: Dict[str, Dict[str, Any]] = {}
    for item in items:
        tags = _extract_hashtags(item.title)
        for tag in tags:
            stats = hashtag_stats.setdefault(tag, {"count": 0, "views": 0, "eng": 0.0})
            stats["count"] += 1
            stats["views"] += item.views or 0
            stats["eng"] += item.engagement_rate or 0.0

    results: List[HashtagTrend] = []
    for tag, stats in sorted(hashtag_stats.items(), key=lambda kv: kv[1]["views"], reverse=True):
        results.append(
            HashtagTrend(
                tag=f"#{tag}",
                posts_count=stats["count"],
                avg_views=int(stats["views"] / stats["count"]),
                engagement_rate=round(stats["eng"] / stats["count"], 1),
                trend="Not Available",
                avg_reach="Not Available",
                avg_impressions="Not Available",
            )
        )
    return results


@router.get("/analysis", response_model=FullGrowthAnalysisOut)
def get_full_growth_analysis(
    platform: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query("30d"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve complete Module 4 Growth & Trend Analysis data computed from real records."""
    items = db.query(ContentItem).filter(ContentItem.user_id == current_user.id).all()
    accounts = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == current_user.id, SocialAccount.is_connected == True)
        .all()
    )
    followers = sum(a.followers_count or 0 for a in accounts)

    # Real category breakdown grouped by content type.
    type_map: Dict[str, Dict[str, float]] = {}
    for item in items:
        key = (item.content_type.value if hasattr(item.content_type, "value") else str(item.content_type)).title()
        stats = type_map.setdefault(key, {"views": 0, "likes": 0, "comments": 0, "eng": 0.0, "count": 0})
        stats["views"] += item.views or 0
        stats["likes"] += item.likes or 0
        stats["comments"] += item.comments or 0
        stats["eng"] += item.engagement_rate or 0.0
        stats["count"] += 1

    categories: List[CategoryTrendOut] = []
    for name, stats in type_map.items():
        categories.append(
            CategoryTrendOut(
                category=f"{name}",
                avg_views=int(stats["views"] / stats["count"]) if stats["count"] else 0,
                avg_likes=int(stats["likes"] / stats["count"]) if stats["count"] else 0,
                avg_comments=int(stats["comments"] / stats["count"]) if stats["count"] else 0,
                avg_engagement_rate=round(stats["eng"] / stats["count"], 1) if stats["count"] else 0.0,
                video_count=stats["count"],
            )
        )
    categories.sort(key=lambda c: c.avg_engagement_rate, reverse=True)
    best_category = categories[0].category if categories else None

    # Real content growth items (only real period metrics; 0 for unknown windows).
    now = datetime.now(timezone.utc)
    content_growth: List[ContentGrowthItemOut] = []
    for item in items:
        pub = item.published_at or now
        views_7d = (item.views or 0) if pub >= now - timedelta(days=7) else 0
        likes_30d = (item.likes or 0) if pub >= now - timedelta(days=30) else 0
        watch_60d = (item.watch_time_minutes or 0.0) / 60.0 if pub >= now - timedelta(days=60) else 0.0
        content_growth.append(
            ContentGrowthItemOut(
                id=item.id,
                title=item.title,
                published_at=pub,
                views_7d=views_7d,
                likes_30d=likes_30d,
                watch_time_60d_hours=round(watch_60d, 1),
                growth_percentage=0.0,
                is_fastest_growing=False,
            )
        )

    total_views = sum(i.views or 0 for i in items)
    total_likes = sum(i.likes or 0 for i in items)
    total_comments = sum(i.comments or 0 for i in items)
    total_shares = sum(i.shares or 0 for i in items)
    avg_eng = round(((total_likes + total_comments + total_shares) / total_views * 100.0), 1) if total_views else 0.0

    data_sufficient = len(items) >= 2
    growth_monitoring = {
        "subscriber_growth": "Not Available",
        "follower_growth": f"{followers}",
        "views_growth": f"{total_views}",
        "watch_time_growth": "Not Available",
        "revenue_growth": "Not Available",
        "engagement_growth": f"{avg_eng}%",
    }

    insights: List[GrowthInsightOut] = []
    if best_category:
        insights.append(
            GrowthInsightOut(
                type="category",
                title="Best Performing Content Category",
                description=f"{best_category} has the highest average engagement rate across your content.",
                metric=best_category,
                impact="Positive",
            )
        )
    if items:
        top = max(items, key=lambda i: i.views or 0)
        insights.append(
            GrowthInsightOut(
                type="content",
                title="Top Performing Content",
                description=f"'{top.title}' leads with {top.views or 0} views.",
                metric=str(top.views or 0),
                impact="Positive",
            )
        )

    return FullGrowthAnalysisOut(
        growth_monitoring=growth_monitoring,
        categories=categories,
        best_category=best_category,
        hashtags=[],
        reach_prediction=ReachPredictionOut(
            previous_reach=0,
            avg_reach=total_views,
            predicted_reach=total_views,
            estimated_views=total_views,
            estimated_engagement=avg_eng,
            data_sufficient=data_sufficient,
            message="Reach requires private analytics; showing real aggregate views.",
        ),
        content_growth=content_growth,
        audience_forecast=AudienceForecastOut(
            current_followers=followers,
            avg_monthly_growth_rate=0.0,
            expected_future_followers=followers,
            growth_percentage=0.0,
            forecast_period_days=30,
            data_sufficient=data_sufficient,
            message="Forecast requires historical snapshot data to project growth.",
        ),
        insights=insights,
    )


def _extract_hashtags(title: str) -> List[str]:
    """Extract simple #hashtags from a content title. Empty when none are present."""
    if not title:
        return []
    return [
        token.lstrip("#")
        for token in title.split()
        if token.startswith("#") and len(token) > 1
    ]
