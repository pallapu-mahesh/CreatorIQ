"""
MongoDB Analytics endpoints — per-module analytics data sourced from MongoDB.

All endpoints:
  - Require JWT auth (current_user)
  - Require ?platform= and ?platform_account_id= query params
  - Filter strictly by user_id + platform + platform_account_id (no cross-user leakage)
  - Return 404 if no MongoDB data exists for the requested combination

Endpoints:
  GET /api/mongo/dashboard   — Dashboard overview analytics
  GET /api/mongo/content     — Content analytics (items + KPIs)
  GET /api/mongo/audience    — Audience demographics + activity + engagement
  GET /api/mongo/growth      — Growth & trend analysis
  GET /api/mongo/revenue     — Revenue analytics
  GET /api/mongo/reports     — Report summary data
  GET /api/mongo/all         — All modules at once
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import mongodb_service as mongo

logger = logging.getLogger("creatoriq.mongo_analytics")

router = APIRouter(prefix="/api/mongo", tags=["MongoDB Analytics"])


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

def _serialize(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Remove MongoDB _id and convert datetime fields to ISO strings."""
    if doc is None:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


def _get_module_or_404(
    user_id: int,
    platform: str,
    platform_account_id: str,
    module: str,
) -> Dict[str, Any]:
    """Fetch analytics cache for a module or raise HTTP 404 if connection inactive or data missing."""
    try:
        # Verify platform is currently connected
        conn = mongo.get_platform_connection(user_id=user_id, platform=platform)
        if not conn or not conn.get("is_connected", True):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Platform '{platform}' is currently disconnected for user {user_id}.",
            )

        doc = mongo.get_analytics_cache(
            user_id=user_id,
            platform=platform,
            platform_account_id=platform_account_id,
            module=module,
        )
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {module} analytics found for platform='{platform}' "
                   f"account='{platform_account_id}'. Connect the platform first.",
        )
    return _serialize(doc) or {}


from pydantic import BaseModel

class SaveModuleRequest(BaseModel):
    platform: str
    platform_account_id: str
    account_name: Optional[str] = "Social Account"
    module: str
    data: Dict[str, Any]


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/save-module", status_code=status.HTTP_200_OK)
def save_module_analytics(
    req: SaveModuleRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Save or update module-level analytics data in MongoDB for the authenticated user
    and active connected platform account.
    
    Document key: (user_id, platform, platform_account_id, module)
    """
    try:
        result = mongo.save_analytics_cache(
            user_id=current_user.id,
            platform=req.platform,
            platform_account_id=req.platform_account_id,
            account_name=req.account_name or req.platform.title(),
            module=req.module,
            data=req.data,
        )
        logger.info(
            "[MongoDB] Saved User %s + %s + %s analytics (account=%s)",
            current_user.id, req.platform, req.module, req.platform_account_id,
        )
        serialized = _serialize(result) or {}
        return {
            "success": True,
            "user_id": current_user.id,
            "platform": req.platform,
            "platform_account_id": req.platform_account_id,
            "module": req.module,
            "saved_at": serialized.get("updated_at"),
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/dashboard")
def get_dashboard_analytics(
    platform: str = Query(..., description="Platform identifier (youtube, instagram, etc.)"),
    platform_account_id: str = Query(..., description="Platform account ID returned by /connect"),
    current_user: User = Depends(get_current_user),
):
    """Retrieve MongoDB-persisted dashboard analytics for the active platform account."""
    doc = _get_module_or_404(current_user.id, platform, platform_account_id, "dashboard")
    return {"module": "dashboard", "user_id": current_user.id, **doc}


@router.get("/content")
def get_content_analytics(
    platform: str = Query(...),
    platform_account_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Retrieve MongoDB-persisted content analytics (items + KPIs) for the active platform account."""
    doc = _get_module_or_404(current_user.id, platform, platform_account_id, "content")
    return {"module": "content", "user_id": current_user.id, **doc}


@router.get("/audience")
def get_audience_analytics(
    platform: str = Query(...),
    platform_account_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Retrieve MongoDB-persisted audience analytics for the active platform account."""
    doc = _get_module_or_404(current_user.id, platform, platform_account_id, "audience")
    return {"module": "audience", "user_id": current_user.id, **doc}


@router.get("/growth")
def get_growth_analytics(
    platform: str = Query(...),
    platform_account_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Retrieve MongoDB-persisted growth & trend analytics for the active platform account."""
    doc = _get_module_or_404(current_user.id, platform, platform_account_id, "growth")
    return {"module": "growth", "user_id": current_user.id, **doc}


@router.get("/revenue")
def get_revenue_analytics(
    platform: str = Query(...),
    platform_account_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Retrieve MongoDB-persisted revenue analytics for the active platform account."""
    doc = _get_module_or_404(current_user.id, platform, platform_account_id, "revenue")
    return {"module": "revenue", "user_id": current_user.id, **doc}


@router.get("/reports")
def get_reports_analytics(
    platform: str = Query(...),
    platform_account_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Retrieve MongoDB-persisted report summary for the active platform account."""
    try:
        doc = mongo.get_report(
            user_id=current_user.id,
            platform=platform,
            platform_account_id=platform_account_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No report data found for platform='{platform}' account='{platform_account_id}'.",
        )
    serialized = _serialize(doc) or {}
    return {"module": "reports", "user_id": current_user.id, **serialized}


@router.get("/all")
def get_all_analytics(
    platform: str = Query(...),
    platform_account_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all cached analytics modules for the active platform account at once."""
    try:
        all_data = mongo.get_all_platform_analytics(
            user_id=current_user.id,
            platform=platform,
            platform_account_id=platform_account_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if not all_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analytics found for platform='{platform}' account='{platform_account_id}'.",
        )
    return {
        "platform": platform,
        "platform_account_id": platform_account_id,
        "user_id": current_user.id,
        "modules": all_data,
    }


@router.get("/connection")
def get_active_connection(
    platform: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Check if a specific platform is actively connected for the current user."""
    try:
        conn = mongo.get_platform_connection(user_id=current_user.id, platform=platform)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if conn is None:
        return {"connected": False, "platform": platform, "connection": None}

    conn = dict(conn)
    conn.pop("_id", None)
    for key in ("connected_at", "updated_at", "disconnected_at"):
        if key in conn and isinstance(conn[key], datetime):
            conn[key] = conn[key].isoformat()

    return {"connected": True, "platform": platform, "connection": conn}
