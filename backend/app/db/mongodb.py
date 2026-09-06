"""
MongoDB client — analytics persistence layer for CreatorIQ.

PostgreSQL handles all auth/user data.
MongoDB handles platform connections, platform-specific account records,
analytics cache (per module), and generated reports.

Collections:
    platform_connections    — connection metadata per user/platform
    youtube_accounts        — YouTube channel info
    instagram_accounts      — Instagram profile info
    facebook_accounts       — Facebook page info
    linkedin_accounts       — LinkedIn account info
    twitter_accounts        — X/Twitter account info
    analytics_cache         — per-module analytics data
    reports                 — generated report documents
"""

import logging
from functools import lru_cache
from typing import Optional

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, OperationFailure

from app.core.config import settings

logger = logging.getLogger("creatoriq.mongodb")

# ---------------------------------------------------------------------------
# Client singleton
# ---------------------------------------------------------------------------

_client: Optional[MongoClient] = None


def _get_client() -> Optional[MongoClient]:
    """Return (or lazily create) the shared MongoClient."""
    global _client
    if _client is not None:
        return _client

    url = settings.MONGODB_URL
    if not url:
        logger.warning("[MongoDB] MONGODB_URL is not configured — MongoDB persistence disabled.")
        return None

    try:
        _client = MongoClient(url, serverSelectionTimeoutMS=5000)
        # Ping to verify connectivity
        _client.admin.command("ping")
        logger.info("[MongoDB] Connected to MongoDB Atlas successfully.")
    except Exception as exc:
        logger.warning("[MongoDB] Connection unavailable (MongoDB disabled): %s", exc)
        _client = None

    return _client


def get_mongo_db() -> Optional[Database]:
    """
    Return the creatoriq MongoDB database handle.
    Returns None when MongoDB is unavailable so callers can degrade gracefully.
    """
    client = _get_client()
    if client is None:
        return None
    db_name = settings.MONGODB_DB_NAME or "creatoriq"
    return client[db_name]


# ---------------------------------------------------------------------------
# Index creation
# ---------------------------------------------------------------------------

def ensure_mongo_indexes() -> None:
    """
    Create all required indexes for the analytics collections.
    Called once at application startup.

    Indexes:
        platform_connections  — (user_id, platform) unique compound
        *_accounts            — (user_id, platform_account_id) unique compound
        analytics_cache       — (user_id, platform, platform_account_id, module) unique compound
                              — (user_id, platform)  for platform-scoped queries
                              — created_at, updated_at
        reports               — (user_id, platform, platform_account_id)
    """
    db = get_mongo_db()
    if db is None:
        logger.warning("[MongoDB] Skipping index creation — MongoDB not available.")
        return

    try:
        # platform_connections
        db["platform_connections"].create_index(
            [("user_id", ASCENDING), ("platform", ASCENDING)],
            unique=True,
            name="uidx_platform_connections_user_platform",
            background=True,
        )

        # per-platform account collections
        for col in ("youtube_accounts", "instagram_accounts", "facebook_accounts",
                    "linkedin_accounts", "twitter_accounts"):
            db[col].create_index(
                [("user_id", ASCENDING), ("platform_account_id", ASCENDING)],
                unique=True,
                name=f"uidx_{col}_user_account",
                background=True,
            )
            db[col].create_index([("user_id", ASCENDING)], background=True)

        # analytics_cache — primary lookup key
        db["analytics_cache"].create_index(
            [
                ("user_id", ASCENDING),
                ("platform", ASCENDING),
                ("platform_account_id", ASCENDING),
                ("module", ASCENDING),
            ],
            unique=True,
            name="uidx_analytics_cache_user_platform_account_module",
            background=True,
        )
        db["analytics_cache"].create_index(
            [("user_id", ASCENDING), ("platform", ASCENDING)],
            name="idx_analytics_cache_user_platform",
            background=True,
        )
        db["analytics_cache"].create_index([("created_at", DESCENDING)], background=True)
        db["analytics_cache"].create_index([("updated_at", DESCENDING)], background=True)

        # reports
        db["reports"].create_index(
            [("user_id", ASCENDING), ("platform", ASCENDING), ("platform_account_id", ASCENDING)],
            name="idx_reports_user_platform_account",
            background=True,
        )
        db["reports"].create_index([("user_id", ASCENDING)], background=True)
        db["reports"].create_index([("created_at", DESCENDING)], background=True)

        logger.info("[MongoDB] Indexes created/verified successfully.")

    except OperationFailure as exc:
        logger.error("[MongoDB] Index creation failed: %s", exc)
    except Exception as exc:
        logger.error("[MongoDB] Unexpected error during index creation: %s", exc)
