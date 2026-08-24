from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.seed_data import ensure_user_seeded_data
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.schemas.analytics import (
    AudienceOverviewOut,
    AudienceDemographicsOut,
    AudienceActivityOut,
    AudienceReachOut,
    AudienceEngagementInsightsOut,
    FollowerGrowthPoint,
)
from app.services.audience_service import audience_service

router = APIRouter(prefix="/api/audience", tags=["Audience Analytics"])


@router.get("/overview", response_model=AudienceOverviewOut)
def get_audience_overview(
    social_account_id: Optional[int] = Query(None),
    platform: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve audience KPI summary metrics (Followers, Growth %, Reach, Impressions, Avg Engagement)."""
    ensure_user_seeded_data(db, current_user)
    return audience_service.get_audience_overview(
        db=db,
        user_id=current_user.id,
        social_account_id=social_account_id,
        platform=platform,
        channel_id=channel_id,
    )


@router.get("/demographics", response_model=AudienceDemographicsOut)
def get_audience_demographics(
    social_account_id: Optional[int] = Query(None),
    platform: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve audience demographic breakdown (Age, Gender, Geography, Device, Active Hours)."""
    ensure_user_seeded_data(db, current_user)
    return audience_service.get_audience_demographics(
        db=db,
        user_id=current_user.id,
        social_account_id=social_account_id,
        platform=platform,
    )


@router.get("/activity", response_model=AudienceActivityOut)
def get_audience_activity(
    platform: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve audience peak active hours, active days, and interaction trends."""
    ensure_user_seeded_data(db, current_user)
    return audience_service.get_audience_activity(db=db, user_id=current_user.id, platform=platform)


@router.get("/reach", response_model=AudienceReachOut)
def get_audience_reach(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve reach and impression insights (returns null for unsupported API metrics)."""
    ensure_user_seeded_data(db, current_user)
    return audience_service.get_audience_reach(db=db, user_id=current_user.id)


@router.get("/engagement", response_model=AudienceEngagementInsightsOut)
def get_audience_engagement(
    platform: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve aggregated engagement metrics (Likes, Comments, Shares, Engagement Rate)."""
    ensure_user_seeded_data(db, current_user)
    return audience_service.get_audience_engagement(db=db, user_id=current_user.id, platform=platform)


@router.get("/growth", response_model=List[FollowerGrowthPoint])
def get_follower_growth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve historical follower growth trajectory per platform."""
    snapshots = (
        db.query(AnalyticsSnapshot)
        .filter(AnalyticsSnapshot.user_id == current_user.id)
        .order_by(AnalyticsSnapshot.date.asc())
        .all()
    )
    if not snapshots:
        return []

    bucket_map = {
        "youtube": "youtube",
        "instagram": "instagram",
        "tiktok": "tiktok",
        "facebook": "facebook",
        "twitter": "twitter",
        "linkedin": "linkedin",
    }
    by_date: Dict[str, FollowerGrowthPoint] = {}
    for s in snapshots:
        d_key = s.date.strftime("%Y-%m-%d")
        if d_key not in by_date:
            by_date[d_key] = FollowerGrowthPoint(
                date=s.date.strftime("%b %d"),
                youtube=0, instagram=0, tiktok=0,
                facebook=0, twitter=0, linkedin=0, total=0,
            )
        point = by_date[d_key]
        bucket = bucket_map.get((s.platform or "").lower())
        val = s.followers_count or 0
        if bucket:
            setattr(point, bucket, val)
        point.total += val

    return [by_date[k] for k in sorted(by_date.keys())]
