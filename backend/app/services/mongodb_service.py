"""
MongoDB Analytics Service — CreatorIQ persistence layer.

Handles all MongoDB read/write operations for:
  - Platform connections
  - Platform-specific account records
  - Analytics cache (per module: dashboard, content, audience, growth, revenue, reports)
  - Generated reports

Design principles:
  - Every write uses upsert (update_one with upsert=True) to prevent duplicates on reconnect.
  - Every query filters by user_id + platform (+ platform_account_id where relevant).
  - Raises RuntimeError on write failure so callers cannot silently continue.
  - Logs every operation with [MongoDB] prefix.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from app.db.mongodb import get_mongo_db

logger = logging.getLogger("creatoriq.mongodb_service")

# ──────────────────────────────────────────────────────────────────────────────
# Collection name map per platform
# ──────────────────────────────────────────────────────────────────────────────
PLATFORM_COLLECTION: Dict[str, str] = {
    "youtube": "youtube_accounts",
    "instagram": "instagram_accounts",
    "facebook": "facebook_accounts",
    "linkedin": "linkedin_accounts",
    "twitter": "twitter_accounts",
}

PLATFORM_DISPLAY: Dict[str, str] = {
    "youtube": "YouTube",
    "instagram": "Instagram",
    "facebook": "Facebook",
    "linkedin": "LinkedIn",
    "twitter": "X/Twitter",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _require_db():
    db = get_mongo_db()
    if db is None:
        raise RuntimeError("[MongoDB] Database is not available. Check MONGODB_URL configuration.")
    return db


# ──────────────────────────────────────────────────────────────────────────────
# Platform connections
# ──────────────────────────────────────────────────────────────────────────────

def save_platform_connection(
    user_id: int,
    platform: str,
    platform_account_id: str,
    account_name: str,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Upsert a platform connection record.
    Returns the saved document.
    Raises RuntimeError on write failure.
    """
    db = _require_db()
    platform = platform.lower()
    display = PLATFORM_DISPLAY.get(platform, platform.title())
    logger.info("[MongoDB] Saving %s connection for user_id=%s account=%s", display, user_id, account_name)

    now = _now()
    doc: Dict[str, Any] = {
        "user_id": user_id,
        "platform": platform,
        "platform_account_id": platform_account_id,
        "account_name": account_name,
        "is_connected": True,
        "updated_at": now,
    }
    if extra:
        doc.update(extra)

    try:
        result = db["platform_connections"].find_one_and_update(
            {"user_id": user_id, "platform": platform},
            {
                "$set": doc,
                "$setOnInsert": {"connected_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        logger.info("[MongoDB] %s connection saved (account=%s).", display, account_name)
        return result
    except PyMongoError as exc:
        raise RuntimeError(f"[MongoDB] Failed to save {display} connection: {exc}") from exc


def get_platform_connection(user_id: int, platform: str) -> Optional[Dict[str, Any]]:
    """Return the active platform connection doc or None."""
    db = _require_db()
    return db["platform_connections"].find_one(
        {"user_id": user_id, "platform": platform.lower(), "is_connected": True}
    )


def get_all_connections(user_id: int) -> List[Dict[str, Any]]:
    """Return all active platform connections for a user."""
    db = _require_db()
    cursor = db["platform_connections"].find({"user_id": user_id, "is_connected": True})
    return list(cursor)


def disconnect_platform(user_id: int, platform: str) -> None:
    """
    Mark a platform as disconnected (does not delete analytics data).
    Raises RuntimeError on failure.
    """
    db = _require_db()
    platform = platform.lower()
    display = PLATFORM_DISPLAY.get(platform, platform.title())
    logger.info("[MongoDB] Disconnecting %s for user_id=%s", display, user_id)
    try:
        db["platform_connections"].update_one(
            {"user_id": user_id, "platform": platform},
            {"$set": {"is_connected": False, "disconnected_at": _now(), "updated_at": _now()}},
        )
        logger.info("[MongoDB] %s disconnected for user_id=%s.", display, user_id)
    except PyMongoError as exc:
        raise RuntimeError(f"[MongoDB] Failed to disconnect {display}: {exc}") from exc


# ──────────────────────────────────────────────────────────────────────────────
# Platform-specific account records
# ──────────────────────────────────────────────────────────────────────────────

def save_platform_account(
    user_id: int,
    platform: str,
    platform_account_id: str,
    account_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Upsert a platform account document into the platform-specific collection.
    Returns the saved document.
    Raises RuntimeError on failure.
    """
    db = _require_db()
    platform = platform.lower()
    display = PLATFORM_DISPLAY.get(platform, platform.title())
    col_name = PLATFORM_COLLECTION.get(platform)
    if not col_name:
        raise ValueError(f"[MongoDB] Unknown platform: {platform}")

    logger.info("[MongoDB] Saving %s account for user_id=%s", display, user_id)

    now = _now()
    doc: Dict[str, Any] = {
        "user_id": user_id,
        "platform": platform,
        "platform_account_id": platform_account_id,
        "updated_at": now,
        **account_data,
    }

    try:
        result = db[col_name].find_one_and_update(
            {"user_id": user_id, "platform_account_id": platform_account_id},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        logger.info("[MongoDB] %s account saved (platform_account_id=%s).", display, platform_account_id)
        return result
    except PyMongoError as exc:
        raise RuntimeError(f"[MongoDB] Failed to save {display} account: {exc}") from exc


def get_platform_account(
    user_id: int,
    platform: str,
    platform_account_id: str,
) -> Optional[Dict[str, Any]]:
    """Fetch a platform account document."""
    db = _require_db()
    col_name = PLATFORM_COLLECTION.get(platform.lower())
    if not col_name:
        return None
    return db[col_name].find_one(
        {"user_id": user_id, "platform_account_id": platform_account_id}
    )


# ──────────────────────────────────────────────────────────────────────────────
# Analytics cache
# ──────────────────────────────────────────────────────────────────────────────

VALID_MODULES = {"dashboard", "content", "audience", "growth", "revenue", "reports"}


def save_analytics_cache(
    user_id: int,
    platform: str,
    platform_account_id: str,
    account_name: str,
    module: str,
    data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Upsert an analytics cache document for a specific module.
    Raises RuntimeError on write failure (never silently continues).
    """
    db = _require_db()
    platform = platform.lower()
    display = PLATFORM_DISPLAY.get(platform, platform.title())

    if module not in VALID_MODULES:
        raise ValueError(f"[MongoDB] Invalid analytics module: {module}. Valid: {VALID_MODULES}")

    logger.info("[MongoDB] Saving %s %s analytics for user_id=%s", display, module, user_id)

    now = _now()
    doc: Dict[str, Any] = {
        "user_id": user_id,
        "platform": platform,
        "platform_account_id": platform_account_id,
        "account_name": account_name,
        "module": module,
        "data": data,
        "updated_at": now,
    }

    try:
        result = db["analytics_cache"].find_one_and_update(
            {
                "user_id": user_id,
                "platform": platform,
                "platform_account_id": platform_account_id,
                "module": module,
            },
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        logger.info("[MongoDB] %s %s analytics saved.", display, module)
        return result
    except PyMongoError as exc:
        raise RuntimeError(
            f"[MongoDB] Failed to save {display} {module} analytics: {exc}"
        ) from exc


def get_analytics_cache(
    user_id: int,
    platform: str,
    platform_account_id: str,
    module: str,
) -> Optional[Dict[str, Any]]:
    """
    Retrieve analytics cache for a specific user+platform+account+module.
    Returns None when no data exists.
    """
    db = _require_db()
    doc = db["analytics_cache"].find_one(
        {
            "user_id": user_id,
            "platform": platform.lower(),
            "platform_account_id": platform_account_id,
            "module": module,
        }
    )
    return doc


def get_all_platform_analytics(
    user_id: int,
    platform: str,
    platform_account_id: str,
) -> Dict[str, Any]:
    """Fetch all cached modules for a platform account. Returns {module: data} dict."""
    db = _require_db()
    cursor = db["analytics_cache"].find(
        {
            "user_id": user_id,
            "platform": platform.lower(),
            "platform_account_id": platform_account_id,
        }
    )
    return {doc["module"]: doc.get("data", {}) for doc in cursor}


# ──────────────────────────────────────────────────────────────────────────────
# Reports
# ──────────────────────────────────────────────────────────────────────────────

def save_report(
    user_id: int,
    platform: str,
    platform_account_id: str,
    account_name: str,
    report_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Upsert a generated report document into the reports collection.
    Raises RuntimeError on failure.
    """
    db = _require_db()
    platform = platform.lower()
    display = PLATFORM_DISPLAY.get(platform, platform.title())
    logger.info("[MongoDB] Saving %s report data for user_id=%s", display, user_id)

    now = _now()
    doc: Dict[str, Any] = {
        "user_id": user_id,
        "platform": platform,
        "platform_account_id": platform_account_id,
        "account_name": account_name,
        "data": report_data,
        "updated_at": now,
    }

    try:
        result = db["reports"].find_one_and_update(
            {"user_id": user_id, "platform": platform, "platform_account_id": platform_account_id},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        logger.info("[MongoDB] %s report data saved.", display)
        return result
    except PyMongoError as exc:
        raise RuntimeError(f"[MongoDB] Failed to save {display} report data: {exc}") from exc


def get_report(
    user_id: int,
    platform: str,
    platform_account_id: str,
) -> Optional[Dict[str, Any]]:
    """Retrieve the most recent report for a platform account."""
    db = _require_db()
    return db["reports"].find_one(
        {
            "user_id": user_id,
            "platform": platform.lower(),
            "platform_account_id": platform_account_id,
        },
        sort=[("updated_at", -1)],
    )
