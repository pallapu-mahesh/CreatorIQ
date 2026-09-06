"""
Platform Connect / Disconnect / List endpoints.

POST /api/platforms/connect
    Body: { platform, account, content, audience }
    - Saves connection to MongoDB platform_connections
    - Saves account info to platform-specific collection
    - Seeds all analytics modules (dashboard, content, audience, growth, revenue, reports)
      into analytics_cache
    - Returns { success, platform, platform_account_id, account_name }

POST /api/platforms/disconnect
    Body: { platform, platform_account_id }
    - Marks connection as disconnected in MongoDB
    - Does NOT delete analytics data

GET /api/platforms/connections
    - Returns all active platform connections for the authenticated user
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import mongodb_service as mongo

logger = logging.getLogger("creatoriq.platforms")

router = APIRouter(prefix="/api/platforms", tags=["Platform Connections"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class AccountInfo(BaseModel):
    name: str
    handle: Optional[str] = None
    avatarUrl: Optional[str] = None
    followersCount: Optional[int] = None
    followingCount: Optional[int] = None
    contentCount: Optional[int] = None
    totalViews: Optional[int] = None
    description: Optional[str] = None
    country: Optional[str] = None
    accountType: Optional[str] = None
    externalUrl: Optional[str] = None


class ContentMetrics(BaseModel):
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    saves: Optional[int] = None
    duration: Optional[int] = None


class ContentItem(BaseModel):
    id: str
    title: str
    type: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    url: Optional[str] = None
    publishedAt: Optional[str] = None
    metrics: Optional[ContentMetrics] = None


class ConnectPlatformRequest(BaseModel):
    platform: str
    account: AccountInfo
    content: Optional[List[ContentItem]] = None
    # Optional: pre-built audience/growth data sent from client
    audience: Optional[Dict[str, Any]] = None


class DisconnectPlatformRequest(BaseModel):
    platform: str
    platform_account_id: str


# ─────────────────────────────────────────────────────────────────────────────
# Helpers — build analytics payloads from account + content data
# ─────────────────────────────────────────────────────────────────────────────

def _build_platform_account_id(platform: str, account: AccountInfo) -> str:
    """Stable, unique account identifier derived from name + follower count."""
    slug = (account.name or "unknown").lower().replace(" ", "_")[:30]
    followers = account.followersCount or 0
    return f"{platform}_{slug}_{followers}"


def _build_dashboard_data(platform: str, account: AccountInfo, content: List[ContentItem]) -> Dict[str, Any]:
    total_views = account.totalViews or 0
    followers = account.followersCount or 0
    content_count = account.contentCount or 0
    total_likes = sum(c.metrics.likes or 0 for c in content if c.metrics)
    total_comments = sum(c.metrics.comments or 0 for c in content if c.metrics)
    avg_likes = round(total_likes / len(content)) if content else 0
    avg_comments = round(total_comments / len(content)) if content else 0
    est_watch_time = round(total_views * 0.04) if total_views else 0
    est_revenue = round((total_views / 1000) * 3.5) if total_views else round(followers * 0.02)

    return {
        "platform": platform,
        "account_name": account.name,
        "followers": followers,
        "following": account.followingCount,
        "total_views": total_views,
        "content_count": content_count,
        "avg_likes": avg_likes,
        "avg_comments": avg_comments,
        "est_watch_time_hours": est_watch_time,
        "est_revenue": est_revenue,
        "growth_data": [
            {"date": "Jan", "value": round(followers * 0.70)},
            {"date": "Feb", "value": round(followers * 0.76)},
            {"date": "Mar", "value": round(followers * 0.82)},
            {"date": "Apr", "value": round(followers * 0.88)},
            {"date": "May", "value": round(followers * 0.94)},
            {"date": "Jun", "value": followers},
        ],
    }


def _build_content_data(platform: str, account: AccountInfo, content: List[ContentItem]) -> Dict[str, Any]:
    items = []
    for c in content:
        m = c.metrics or ContentMetrics()
        views = m.views or 0
        likes = m.likes or 0
        comments = m.comments or 0
        shares = m.shares or 0
        eng = round(((likes + comments + shares) / views * 100), 2) if views else 0.0
        items.append({
            "id": c.id,
            "title": c.title,
            "type": c.type or "post",
            "thumbnailUrl": c.thumbnailUrl,
            "url": c.url,
            "publishedAt": c.publishedAt,
            "platform": platform,
            "views": views,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "saves": m.saves,
            "engagement_rate": eng,
            "watch_time_minutes": round((m.duration or 0) / 60, 1),
        })

    total_views = sum(i["views"] for i in items)
    total_likes = sum(i["likes"] for i in items)
    total_comments = sum(i["comments"] for i in items)
    total_shares = sum(i["shares"] for i in items)
    avg_eng = round(sum(i["engagement_rate"] for i in items) / len(items), 2) if items else 0.0

    return {
        "platform": platform,
        "account_name": account.name,
        "kpis": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "total_content_count": len(items),
            "avg_engagement_rate": avg_eng,
            "total_watch_time_hours": round(sum((c.metrics.duration or 0) for c in content if c.metrics) / 3600, 1),
        },
        "items": items,
    }


def _build_audience_data(platform: str, account: AccountInfo, content: List[ContentItem]) -> Dict[str, Any]:
    followers = account.followersCount or 0
    total_views = sum((c.metrics.views or 0) for c in content if c.metrics)
    total_likes = sum((c.metrics.likes or 0) for c in content if c.metrics)
    total_comments = sum((c.metrics.comments or 0) for c in content if c.metrics)
    avg_eng = round(((total_likes + total_comments) / total_views * 100), 2) if total_views else 0.0

    # Day-of-week engagement from content published timestamps
    day_stats: Dict[str, List[float]] = {
        d: [] for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    }
    for item in content:
        if item.publishedAt and item.metrics:
            try:
                pub = datetime.fromisoformat(item.publishedAt.replace("Z", "+00:00"))
                day = pub.strftime("%A")
                views = item.metrics.views or 0
                likes = item.metrics.likes or 0
                comments = item.metrics.comments or 0
                eng = round(((likes + comments) / views * 100), 2) if views else 0.0
                if day in day_stats:
                    day_stats[day].append(eng)
            except Exception:
                pass

    most_active_days = [
        {"day": d, "activity_pct": round(sum(v) / len(v), 2) if v else 0.0}
        for d, v in day_stats.items()
    ]

    return {
        "platform": platform,
        "account_name": account.name,
        "overview": {
            "total_followers": followers,
            "avg_engagement_rate": avg_eng,
            "total_views": total_views,
        },
        "demographics": {
            "top_countries": [{"country": account.country or "Global", "percentage": 100.0, "count": followers}] if account.country else [],
            "age_distribution": [],
            "gender_distribution": [],
            "device_usage": [],
        },
        "activity": {
            "most_active_days": most_active_days,
            "most_active_hours": [],
            "peak_engagement_time": None,
        },
        "engagement": {
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": 0,
            "avg_engagement_rate": avg_eng,
        },
    }


def _build_growth_data(platform: str, account: AccountInfo, content: List[ContentItem]) -> Dict[str, Any]:
    followers = account.followersCount or 0
    total_views = sum((c.metrics.views or 0) for c in content if c.metrics)
    total_likes = sum((c.metrics.likes or 0) for c in content if c.metrics)
    total_comments = sum((c.metrics.comments or 0) for c in content if c.metrics)
    total_shares = sum((c.metrics.shares or 0) for c in content if c.metrics)
    avg_eng = round(((total_likes + total_comments + total_shares) / total_views * 100), 1) if total_views else 0.0

    # Build historical points from content items sorted by date
    historical = []
    sorted_content = sorted(
        [c for c in content if c.publishedAt],
        key=lambda c: c.publishedAt or ""
    )
    for c in sorted_content[-14:]:
        try:
            pub = datetime.fromisoformat(c.publishedAt.replace("Z", "+00:00"))
            historical.append({
                "date": pub.strftime("%b %d"),
                "views": c.metrics.views or 0 if c.metrics else 0,
                "reach": None,
            })
        except Exception:
            pass

    # Content type breakdown
    type_map: Dict[str, Dict] = {}
    for item in content:
        key = (item.type or "post").title()
        s = type_map.setdefault(key, {"views": 0, "likes": 0, "comments": 0, "eng": 0.0, "count": 0})
        m = item.metrics
        s["views"] += m.views or 0 if m else 0
        s["likes"] += m.likes or 0 if m else 0
        s["comments"] += m.comments or 0 if m else 0
        s["eng"] += (round(((m.likes or 0 + m.comments or 0) / (m.views or 1)) * 100, 1)) if m else 0.0
        s["count"] += 1

    categories = [
        {
            "category": name,
            "avg_views": round(s["views"] / s["count"]) if s["count"] else 0,
            "avg_likes": round(s["likes"] / s["count"]) if s["count"] else 0,
            "avg_comments": round(s["comments"] / s["count"]) if s["count"] else 0,
            "avg_engagement_rate": round(s["eng"] / s["count"], 1) if s["count"] else 0.0,
            "video_count": s["count"],
        }
        for name, s in type_map.items()
    ]

    return {
        "platform": platform,
        "account_name": account.name,
        "historical": historical,
        "total_growth_rate": 0.0,
        "projected_reach": total_views,
        "categories": sorted(categories, key=lambda c: c["avg_engagement_rate"], reverse=True),
        "growth_monitoring": {
            "follower_growth": str(followers),
            "views_growth": str(total_views),
            "engagement_growth": f"{avg_eng}%",
            "subscriber_growth": "Not Available",
            "watch_time_growth": "Not Available",
            "revenue_growth": "Not Available",
        },
        "audience_forecast": {
            "current_followers": followers,
            "avg_monthly_growth_rate": 0.0,
            "expected_future_followers": followers,
            "growth_percentage": 0.0,
            "forecast_period_days": 30,
        },
    }


def _build_revenue_data(platform: str, account: AccountInfo, content: List[ContentItem]) -> Dict[str, Any]:
    total_views = account.totalViews or sum((c.metrics.views or 0) for c in content if c.metrics)
    followers = account.followersCount or 0
    est_revenue = round((total_views / 1000) * 3.5) if total_views else round(followers * 0.02)

    monthly_revenue = [
        {"month": m, "revenue": round(est_revenue * factor)}
        for m, factor in [
            ("Jan", 0.72), ("Feb", 0.78), ("Mar", 0.82), ("Apr", 0.88),
            ("May", 0.94), ("Jun", 1.0), ("Jul", 0.97), ("Aug", 1.03),
        ]
    ]

    return {
        "platform": platform,
        "account_name": account.name,
        "estimated_monthly_revenue": est_revenue,
        "estimated_total_revenue": round(est_revenue * 8),
        "cpm": 3.5 if platform == "youtube" else 2.0,
        "total_views": total_views,
        "monthly_revenue": monthly_revenue,
        "revenue_sources": [
            {"source": "Ad Revenue", "amount": round(est_revenue * 0.65), "percentage": 65},
            {"source": "Sponsorships", "amount": round(est_revenue * 0.25), "percentage": 25},
            {"source": "Memberships", "amount": round(est_revenue * 0.10), "percentage": 10},
        ],
    }


def _build_reports_data(platform: str, account: AccountInfo, content: List[ContentItem]) -> Dict[str, Any]:
    total_views = account.totalViews or sum((c.metrics.views or 0) for c in content if c.metrics)
    total_likes = sum((c.metrics.likes or 0) for c in content if c.metrics)
    total_comments = sum((c.metrics.comments or 0) for c in content if c.metrics)
    total_shares = sum((c.metrics.shares or 0) for c in content if c.metrics)
    followers = account.followersCount or 0
    avg_eng = round(((total_likes + total_comments + total_shares) / total_views * 100), 2) if total_views else 0.0
    est_revenue = round((total_views / 1000) * 3.5) if total_views else round(followers * 0.02)

    top_content = sorted(
        [c for c in content if c.metrics],
        key=lambda c: c.metrics.views or 0,
        reverse=True
    )[:5]

    return {
        "platform": platform,
        "account_name": account.name,
        "summary": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "total_followers": followers,
            "avg_engagement_rate": avg_eng,
            "estimated_revenue": est_revenue,
            "content_count": len(content),
        },
        "top_content": [
            {
                "id": c.id,
                "title": c.title,
                "views": c.metrics.views or 0 if c.metrics else 0,
                "likes": c.metrics.likes or 0 if c.metrics else 0,
                "comments": c.metrics.comments or 0 if c.metrics else 0,
            }
            for c in top_content
        ],
    }


from app.db.database import get_db
from app.models.social_account import SocialAccount, PlatformType, SyncStatus
from app.models.content_item import ContentItem as DBContentItem, ContentType as DBContentType
from sqlalchemy.orm import Session


def _resolve_platform_enum(platform_str: str) -> Optional[PlatformType]:
    p = platform_str.lower()
    for pt in PlatformType:
        if pt.value == p:
            return pt
    return None


def _resolve_content_type(type_str: Optional[str]) -> DBContentType:
    if not type_str:
        return DBContentType.POST
    t = type_str.lower()
    if "video" in t:
        return DBContentType.VIDEO
    if "reel" in t:
        return DBContentType.REEL
    if "short" in t:
        return DBContentType.SHORT
    return DBContentType.POST


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/connect", status_code=status.HTTP_200_OK)
def connect_platform(
    req: ConnectPlatformRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Connect a social platform for the authenticated user without disconnecting other platforms.

    Persists to:
      1. PostgreSQL social_accounts + content_items
      2. MongoDB platform_connections + analytics_cache (if available)
    """
    platform = req.platform.lower()
    user_id = current_user.id
    account = req.account
    content = req.content or []

    # Derive a stable account ID
    platform_account_id = _build_platform_account_id(platform, account)

    # ── 1. Persist to PostgreSQL ──────────────────────────────────────────────
    platform_enum = _resolve_platform_enum(platform)
    now_utc = datetime.now(timezone.utc)
    
    # Query existing account record for this platform & user
    sql_account = None
    if platform_enum:
        sql_account = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == platform_enum,
        ).first()

    if sql_account:
        sql_account.is_connected = True
        sql_account.status = "Connected"
        sql_account.channel_name = account.name
        sql_account.channel_handle = account.handle
        sql_account.platform_username = account.handle or account.name
        sql_account.avatar_url = account.avatarUrl
        sql_account.profile_image = account.avatarUrl
        sql_account.followers_count = account.followersCount
        sql_account.following_count = account.followingCount
        sql_account.content_count = account.contentCount
        sql_account.total_views = account.totalViews
        sql_account.description = account.description
        sql_account.country = account.country
        sql_account.connected_at = now_utc
        sql_account.last_synced_at = now_utc
        sql_account.sync_status = SyncStatus.SUCCESS
    elif platform_enum:
        sql_account = SocialAccount(
            user_id=user_id,
            platform=platform_enum,
            channel_id=platform_account_id,
            channel_name=account.name,
            channel_handle=account.handle,
            platform_username=account.handle or account.name,
            avatar_url=account.avatarUrl,
            profile_image=account.avatarUrl,
            followers_count=account.followersCount,
            following_count=account.followingCount,
            content_count=account.contentCount,
            total_views=account.totalViews,
            description=account.description,
            country=account.country,
            is_connected=True,
            status="Connected",
            connected_at=now_utc,
            last_synced_at=now_utc,
            sync_status=SyncStatus.SUCCESS,
        )
        db.add(sql_account)

    db.commit()
    if sql_account:
        db.refresh(sql_account)

        # Sync content items to PostgreSQL
        if content:
            # Remove old items for this specific social account to replace with fresh sync
            db.query(DBContentItem).filter(
                DBContentItem.user_id == user_id,
                DBContentItem.social_account_id == sql_account.id,
            ).delete()

            for item in content:
                m = item.metrics or ContentMetrics()
                pub_dt = now_utc
                if item.publishedAt:
                    try:
                        pub_dt = datetime.fromisoformat(item.publishedAt.replace("Z", "+00:00"))
                    except Exception:
                        pub_dt = now_utc

                views_cnt = m.views or 0
                likes_cnt = m.likes or 0
                comments_cnt = m.comments or 0
                shares_cnt = m.shares or 0
                eng_rate = round(((likes_cnt + comments_cnt + shares_cnt) / views_cnt * 100), 2) if views_cnt > 0 else 0.0

                db_item = DBContentItem(
                    user_id=user_id,
                    social_account_id=sql_account.id,
                    platform=platform,
                    title=item.title or "Untitled",
                    content_type=_resolve_content_type(item.type),
                    external_id=item.id,
                    url=item.url,
                    thumbnail_url=item.thumbnailUrl,
                    published_at=pub_dt,
                    views=views_cnt,
                    likes=likes_cnt,
                    comments=comments_cnt,
                    shares=shares_cnt,
                    saves=m.saves,
                    watch_time_minutes=round((m.duration or 0) / 60, 2),
                    revenue=round((views_cnt / 1000) * 3.5, 2) if platform == "youtube" else 0.0,
                    engagement_rate=eng_rate,
                )
                db.add(db_item)
            db.commit()

    # ── 2. Persist to MongoDB (if available) ──────────────────────────────────
    try:
        mongo.save_platform_connection(
            user_id=user_id,
            platform=platform,
            platform_account_id=platform_account_id,
            account_name=account.name,
        )

        mongo.save_platform_account(
            user_id=user_id,
            platform=platform,
            platform_account_id=platform_account_id,
            account_data={
                "account_name": account.name,
                "handle": account.handle,
                "avatar_url": account.avatarUrl,
                "followers_count": account.followersCount,
                "following_count": account.followingCount,
                "content_count": account.contentCount,
                "total_views": account.totalViews,
                "description": account.description,
                "country": account.country,
                "account_type": account.accountType,
                "external_url": account.externalUrl,
            },
        )

        modules_data = {
            "dashboard": _build_dashboard_data(platform, account, content),
            "content": _build_content_data(platform, account, content),
            "audience": _build_audience_data(platform, account, content),
            "growth": _build_growth_data(platform, account, content),
            "revenue": _build_revenue_data(platform, account, content),
            "reports": _build_reports_data(platform, account, content),
        }

        for module, data in modules_data.items():
            mongo.save_analytics_cache(
                user_id=user_id,
                platform=platform,
                platform_account_id=platform_account_id,
                account_name=account.name,
                module=module,
                data=data,
            )

        mongo.save_report(
            user_id=user_id,
            platform=platform,
            platform_account_id=platform_account_id,
            account_name=account.name,
            report_data=modules_data["reports"],
        )

        logger.info(
            "[Platforms] Platform %s connected successfully for user_id=%s (account=%s, id=%s)",
            platform, user_id, account.name, platform_account_id,
        )
    except Exception as mongo_err:
        logger.warning("[Platforms] MongoDB persistence notice: %s", mongo_err)

    return {
        "success": True,
        "platform": platform,
        "platform_account_id": platform_account_id,
        "account_name": account.name,
        "message": f"Platform '{platform}' connected successfully.",
    }


@router.post("/disconnect", status_code=status.HTTP_200_OK)
def disconnect_platform(
    req: DisconnectPlatformRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark ONLY the specified platform as disconnected.
    Other connected platforms and their data remain completely untouched.
    """
    platform = req.platform.lower()
    platform_enum = _resolve_platform_enum(platform)

    # 1. Update PostgreSQL SocialAccount
    if platform_enum:
        sql_account = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id,
            SocialAccount.platform == platform_enum,
        ).first()
        if sql_account:
            sql_account.is_connected = False
            sql_account.status = "Disconnected"
            db.commit()

    # 2. Update MongoDB
    try:
        mongo.disconnect_platform(
            user_id=current_user.id,
            platform=platform,
        )
    except Exception as exc:
        logger.warning("[Platforms] MongoDB disconnect notice: %s", exc)

    return {
        "success": True,
        "platform": req.platform,
        "message": f"Platform '{req.platform}' disconnected successfully. Other platforms remain active.",
    }


@router.get("/connections", status_code=status.HTTP_200_OK)
def get_platform_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve ALL active platform connections for the authenticated user.
    Merges PostgreSQL and MongoDB records so all connected platforms are surfaced.
    """
    merged_connections: Dict[str, Dict[str, Any]] = {}

    # 1. Fetch from PostgreSQL
    try:
        sql_accounts = db.query(SocialAccount).filter(
            SocialAccount.user_id == current_user.id,
            SocialAccount.is_connected == True,
        ).all()

        for a in sql_accounts:
            p_name = a.platform.value if hasattr(a.platform, "value") else str(a.platform).lower()
            merged_connections[p_name] = {
                "platform": p_name,
                "platform_account_id": a.channel_id or f"{p_name}_{a.id}",
                "account_name": a.channel_name or a.platform_username or p_name.capitalize(),
                "handle": a.channel_handle or a.platform_username,
                "avatar_url": a.avatar_url or a.profile_image,
                "followers_count": a.followers_count or 0,
                "following_count": a.following_count,
                "total_views": a.total_views or 0,
                "content_count": a.content_count or 0,
                "connected_at": a.connected_at.isoformat() if a.connected_at else None,
                "is_connected": True,
            }
    except Exception as sql_err:
        logger.warning("[Platforms] Error querying PostgreSQL connections: %s", sql_err)

    # 2. Fetch from MongoDB and merge/supplement
    try:
        mongo_conns = mongo.get_all_connections(user_id=current_user.id)
        for mc in mongo_conns:
            mc.pop("_id", None)
            p_name = mc.get("platform", "").lower()
            if not p_name or not mc.get("is_connected", True):
                continue
            if p_name not in merged_connections:
                # Convert datetimes to ISO strings
                for key in ("connected_at", "updated_at", "disconnected_at"):
                    if key in mc and isinstance(mc[key], datetime):
                        mc[key] = mc[key].isoformat()
                merged_connections[p_name] = mc
    except Exception as mongo_err:
        logger.warning("[Platforms] Error querying MongoDB connections: %s", mongo_err)

    return {"connections": list(merged_connections.values())}

