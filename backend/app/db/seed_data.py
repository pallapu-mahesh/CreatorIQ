from datetime import datetime, timedelta, timezone, date
import random
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.social_account import SocialAccount, PlatformType, SyncStatus
from app.models.content_item import ContentItem, ContentType
from app.models.analytics_snapshot import AnalyticsSnapshot

SAMPLE_TITLES = {
    PlatformType.YOUTUBE: [
        ("How to Build Fullstack Apps in 2026", ContentType.VIDEO, 45000, 3200, 410, 180, 5400.0, 1250.0),
        ("FastAPI + React Complete Masterclass", ContentType.VIDEO, 82000, 6400, 890, 420, 11200.0, 2400.0),
        ("5 AI Tools You Must Use Everyday", ContentType.SHORT, 125000, 14200, 1100, 1850, 2100.0, 450.0),
        ("Behind the Scenes of My Creator Business", ContentType.VIDEO, 31000, 2100, 320, 95, 3800.0, 780.0),
        ("10 Mins Coding Challenge with Python", ContentType.SHORT, 98000, 9800, 750, 1200, 1600.0, 310.0),
    ],
    PlatformType.INSTAGRAM: [
        ("Daily Tech Essentials & Workspace Setup", ContentType.REEL, 74000, 8200, 540, 1300, 1200.0, 380.0),
        ("Why UI Design Matters in Modern Software", ContentType.POST, 22000, 3100, 190, 240, 0.0, 0.0),
        ("React Performance Optimization Hacks", ContentType.REEL, 110000, 12800, 930, 2100, 1800.0, 620.0),
        ("A Day in the Life of a Tech Influencer", ContentType.REEL, 53000, 6100, 420, 870, 950.0, 290.0),
        ("My Top 3 Creator Tools Comparison", ContentType.POST, 18500, 2400, 140, 180, 0.0, 0.0),
    ],
    PlatformType.TIKTOK: [
        ("This AI trick saves 5 hours a week! 🚀", ContentType.SHORT, 240000, 31000, 2400, 5800, 3200.0, 850.0),
        ("How I edit videos in 10 minutes", ContentType.SHORT, 165000, 21000, 1600, 3900, 2400.0, 520.0),
        ("React vs Vue vs Svelte in 30 seconds", ContentType.SHORT, 310000, 42000, 3800, 8900, 4100.0, 1100.0),
    ],
    PlatformType.FACEBOOK: [
        ("Creator Growth Blueprint 2026", ContentType.POST, 14500, 1200, 95, 110, 0.0, 120.0),
        ("Live Q&A: Social Media Algorithms Explained", ContentType.VIDEO, 38000, 3400, 410, 320, 4200.0, 550.0),
    ],
    PlatformType.TWITTER: [
        ("10 lessons from growing to 100k subscribers in 1 year 🧵", ContentType.POST, 42000, 4800, 620, 1400, 0.0, 150.0),
        ("The secret to high engagement isn't luck, it's consistency.", ContentType.POST, 28000, 3100, 380, 890, 0.0, 90.0),
    ],
    PlatformType.LINKEDIN: [
        ("Building a Data-Driven Creator Enterprise", ContentType.POST, 19500, 2100, 280, 450, 0.0, 340.0),
        ("How We Scaled Content Operations to 1M Views", ContentType.POST, 31000, 3600, 490, 710, 0.0, 520.0),
    ],
}


def ensure_user_seeded_data(db: Session, user: User) -> None:
    """No-op: never create mock/fake accounts, content, or analytics snapshots.

    All social accounts, content items and snapshots must come from real API data
    (OAuth connect, public channel/page analysis, or sync). This prevents a fresh
    user from appearing to have connected accounts they never connected.
    """
    return
