from pathlib import Path
from dotenv import load_dotenv

from pydantic_settings import BaseSettings
from functools import lru_cache

# ---------------------------------------------------------------
# Explicit dotenv loading — resolves backend/.env by ABSOLUTE path
# (from this file: backend/app/core/config.py -> parents[2] = backend/),
# so the correct file is loaded regardless of the process CWD
# (e.g. `uvicorn app.main:app --app-dir backend` launched from the
# project root). Real env vars still take priority (override=False).
# ---------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE_CANDIDATES = [
    BACKEND_DIR / ".env",
    BACKEND_DIR / "app" / ".env",
]

for _env_file in ENV_FILE_CANDIDATES:
    if _env_file.exists():
        load_dotenv(_env_file, override=False)


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All secrets are read from .env — never hardcoded here.
    """

    # App
    APP_NAME: str = "CreatorIQ"
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    # Comma-separated list of extra CORS origins, e.g. "http://localhost:5174,http://localhost:5175"
    CORS_ALLOW_ORIGINS: str = ""

    # PostgreSQL
    DATABASE_URL: str

    # MongoDB
    MONGODB_URL: str = ""
    MONGODB_DB_NAME: str = "creatoriq_analytics"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth / API Keys
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    CLIENT_ID: str = ""
    CLIENT_SECRET: str = ""

    # SMTP / Email delivery (report emails). Never hardcode credentials.
    # If SMTP_HOST is empty, the email service reports "email delivery
    # unavailable" instead of pretending the email was sent.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

    @property
    def google_client_id(self) -> str:
        return (self.GOOGLE_CLIENT_ID or self.CLIENT_ID).strip()

    @property
    def google_client_secret(self) -> str:
        return (self.GOOGLE_CLIENT_SECRET or self.CLIENT_SECRET).strip()

    class Config:
        # Load backend/.env and backend/app/.env by absolute path so the correct
        # file is used no matter the process CWD. Values were already injected into
        # os.environ by load_dotenv above (env vars take priority over env_file).
        env_file = tuple(str(p) for p in ENV_FILE_CANDIDATES if p.exists())
        env_file_encoding = "utf-8"
        extra = "ignore"




@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


settings = get_settings()
