import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger("creatoriq.database")


def _build_engine():
    """Build the SQLAlchemy engine.

    - Uses the configured DATABASE_URL (PostgreSQL or SQLite).
    - If the configured driver is missing (e.g. postgresql+psycopg without the
      psycopg v3 package installed), transparently retries with the sibling
      driver (psycopg2) before giving up.
    - Never fails silently: real connection errors are logged, and SQLite is
      used only as a clearly logged last resort so the API stays usable.
    """
    configured_url = settings.DATABASE_URL

    candidate_urls = [configured_url]
    if "+psycopg2" in configured_url:
        candidate_urls.append(configured_url.replace("+psycopg2", "+psycopg", 1))
    elif "+psycopg" in configured_url:
        candidate_urls.append(configured_url.replace("+psycopg", "+psycopg2", 1))

    last_error = None
    for url in candidate_urls:
        try:
            if url.startswith("sqlite"):
                return create_engine(url, connect_args={"check_same_thread": False})
            engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            # Test the connection immediately so a broken DB fails loudly here.
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            if url != configured_url:
                logger.warning(
                    "Configured DATABASE_URL driver unavailable; connected with alternate URL: %s",
                    url.split("://")[0],
                )
            return engine
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Database engine attempt failed for %s: %s: %s",
                url.split("://")[0],
                type(exc).__name__,
                exc,
            )

    logger.error(
        "PostgreSQL unavailable (%s). Falling back to SQLite: sqlite:///./creatoriq.db",
        last_error,
    )
    return create_engine("sqlite:///./creatoriq.db", connect_args={"check_same_thread": False})


# Create the SQLAlchemy engine
engine = _build_engine()

# Session factory — each request gets its own session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base — all ORM models inherit from this
Base = declarative_base()


def ensure_db_schema():
    """Ensure database tables have all generic columns in PostgreSQL / SQLite."""
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS default_dashboard VARCHAR(100) DEFAULT '/dashboard';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'CHANNEL_ID';"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS channel_handle VARCHAR(255);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Connected';"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE;"))

            # Real metric columns for audience / growth analytics.
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS followers_count INTEGER;"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS following_count INTEGER;"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS total_views INTEGER;"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS content_count INTEGER;"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS country VARCHAR(255);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS category VARCHAR(255);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS description VARCHAR(2000);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS website VARCHAR(500);"))
            conn.execute(text("ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;"))

            # Metric counters must be 64-bit — real accounts can exceed the 32-bit
            # INTEGER range (e.g. channels with billions of lifetime views).
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN followers_count TYPE BIGINT;"))
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN following_count TYPE BIGINT;"))
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN total_views TYPE BIGINT;"))
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN content_count TYPE BIGINT;"))

            # Widen image/avatar URL columns — Facebook CDN profile image URLs exceed VARCHAR(500).
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN avatar_url TYPE VARCHAR(2000);"))
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN profile_image TYPE VARCHAR(2000);"))
            conn.execute(text("ALTER TABLE social_accounts ALTER COLUMN access_token TYPE VARCHAR(2000);"))

            # Content items generic metrics
            conn.execute(text("ALTER TABLE content_items ADD COLUMN IF NOT EXISTS saves INTEGER;"))
            conn.execute(text("ALTER TABLE content_items ADD COLUMN IF NOT EXISTS reach INTEGER;"))
    except Exception as e:
        # SQLite does not support ADD COLUMN IF NOT EXISTS or ALTER COLUMN TYPE.
        # Use the PRAGMA-based migration below instead.
        _ensure_sqlite_columns()
        logger.debug("ensure_db_schema postgres block skipped (%s): %s", type(e).__name__, e)


def _ensure_sqlite_columns():
    """SQLite fallback: add missing columns via PRAGMA inspection + ALTER TABLE ADD COLUMN."""
    try:
        table_columns = {
            "users": {
                "last_login": "TIMESTAMP",
                "avatar_url": "TEXT",
                "theme": "VARCHAR(20)",
                "language": "VARCHAR(10)",
                "default_dashboard": "VARCHAR(100)",
                "auth_provider": "VARCHAR(20)",
                "token_version": "INTEGER",
            },
            "social_accounts": {
                "connection_type": "VARCHAR(50)",
                "channel_id": "VARCHAR(255)",
                "channel_name": "VARCHAR(255)",
                "channel_handle": "VARCHAR(255)",
                "profile_image": "VARCHAR(500)",
                "status": "VARCHAR(50)",
                "connected_at": "TIMESTAMP",
                "followers_count": "INTEGER",
                "following_count": "INTEGER",
                "total_views": "INTEGER",
                "content_count": "INTEGER",
                "country": "VARCHAR(255)",
                "category": "VARCHAR(255)",
                "description": "VARCHAR(2000)",
                "website": "VARCHAR(500)",
                "verified": "BOOLEAN",
            },
            "content_items": {
                "saves": "INTEGER",
                "reach": "INTEGER",
            },
        }
        with engine.begin() as conn:
            for table, cols in table_columns.items():
                existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table});")).fetchall()}
                for col_name, col_type in cols.items():
                    if col_name not in existing:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type};"))
    except Exception as e:
        logger.debug("_ensure_sqlite_columns skipped (%s): %s", type(e).__name__, e)


def get_db():
    """
    FastAPI dependency that provides a database session per request.
    Ensures the session is always closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
