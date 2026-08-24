from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.seed_data import ensure_user_seeded_data
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    ContentItemOut,
    ContentKPIOut,
    ContentCompareRequest,
    ContentTrendSeriesOut,
)
from app.services.content_service import content_service

router = APIRouter(prefix="/api/content", tags=["Content Analytics"])


@router.get("/items", response_model=List[ContentItemOut])
def get_content_items(
    social_account_id: Optional[int] = Query(None, description="Filter by active social account ID"),
    platform: Optional[str] = Query(None, description="Filter by platform (e.g. youtube, instagram)"),
    content_type: Optional[str] = Query(None, description="Filter by type (video, reel, post, short)"),
    search: Optional[str] = Query(None, description="Search by title"),
    sort_by: Optional[str] = Query("newest", description="Sort field: views, likes, comments, engagement_rate, oldest, newest"),
    date_range: Optional[str] = Query("all", description="Date range: 7d, 30d, 90d, 1y, all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve filtered and sorted content analytics items via content_service."""
    ensure_user_seeded_data(db, current_user)
    return content_service.get_content_items(
        db=db,
        user_id=current_user.id,
        social_account_id=social_account_id,
        platform=platform,
        content_type=content_type,
        search=search,
        sort_by=sort_by,
        date_range=date_range,
    )


@router.get("/kpis", response_model=ContentKPIOut)
def get_content_kpis(
    social_account_id: Optional[int] = Query(None),
    platform: Optional[str] = Query(None),
    date_range: Optional[str] = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregated KPI metrics summary for content performance via content_service."""
    ensure_user_seeded_data(db, current_user)
    return content_service.get_content_kpis(
        db=db,
        user_id=current_user.id,
        social_account_id=social_account_id,
        platform=platform,
        date_range=date_range,
    )


@router.get("/trends", response_model=ContentTrendSeriesOut)
def get_content_trends(
    social_account_id: Optional[int] = Query(None),
    platform: Optional[str] = Query(None),
    timeframe: Optional[str] = Query("30d"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve time-series performance trends via content_service."""
    ensure_user_seeded_data(db, current_user)
    return content_service.get_content_trends(
        db=db,
        user_id=current_user.id,
        social_account_id=social_account_id,
        platform=platform,
        timeframe=timeframe,
    )


@router.get("/top-performing", response_model=List[ContentItemOut])
def get_top_performing_content(
    social_account_id: Optional[int] = Query(None),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve top performing content items ranked by views."""
    ensure_user_seeded_data(db, current_user)
    return content_service.get_content_items(
        db=db,
        user_id=current_user.id,
        social_account_id=social_account_id,
        sort_by="views",
    )[:limit]


@router.post("/compare", response_model=List[ContentItemOut])
def compare_content_items(
    req: ContentCompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compare specific content items side-by-side via content_service."""
    return content_service.compare_content(
        db=db,
        user_id=current_user.id,
        content_ids=req.content_ids,
    )
