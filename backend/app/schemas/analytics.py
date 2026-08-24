from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.content_item import ContentType


class ContentItemOut(BaseModel):
    id: int
    user_id: int
    social_account_id: int
    platform: str
    title: str
    content_type: ContentType
    external_id: Optional[str] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    published_at: datetime
    views: int
    likes: int
    comments: int
    shares: int
    saves: Optional[int] = None
    watch_time_minutes: float
    reach: Optional[int] = None
    revenue: float
    engagement_rate: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentKPIOut(BaseModel):
    total_views: int
    total_likes: int
    total_comments: int
    total_shares: int
    total_saves: Optional[int] = None
    total_reach: Optional[int] = None
    avg_engagement_rate: float
    total_watch_time_hours: float
    total_content_count: int
    views_change_pct: Optional[float] = 0.0
    likes_change_pct: Optional[float] = 0.0
    comments_change_pct: Optional[float] = 0.0
    shares_change_pct: Optional[float] = 0.0
    saves_change_pct: Optional[float] = 0.0
    watch_time_change_pct: Optional[float] = 0.0
    reach_change_pct: Optional[float] = 0.0
    engagement_change_pct: Optional[float] = 0.0


class ContentTrendPoint(BaseModel):
    date: str
    views: int
    likes: int
    comments: int
    shares: int
    watch_time_hours: float
    reach: Optional[int] = None
    engagement_rate: float


class ContentTrendSeriesOut(BaseModel):
    timeframe: str
    points: List[ContentTrendPoint]


class ContentCompareRequest(BaseModel):
    content_ids: List[int]


class AudienceDemographicsOut(BaseModel):
    age_distribution: List[Dict[str, Any]]
    gender_distribution: List[Dict[str, Any]]
    top_countries: List[Dict[str, Any]]
    device_usage: List[Dict[str, Any]]
    active_hours: List[Dict[str, Any]]


class AudienceOverviewOut(BaseModel):
    total_followers: int
    new_followers: Optional[int] = None
    monthly_follower_growth_pct: Optional[float] = None
    audience_reach: Optional[int] = None
    impressions: Optional[int] = None
    avg_engagement_rate: float


class AudienceActivityOut(BaseModel):
    most_active_hours: List[Dict[str, Any]]
    most_active_days: List[Dict[str, Any]]
    peak_engagement_time: Optional[str] = None
    activity_trends: List[Dict[str, Any]]


class AudienceReachOut(BaseModel):
    total_reach: Optional[int] = None
    total_impressions: Optional[int] = None
    unique_viewers: Optional[int] = None
    reach_trend: List[Dict[str, Any]]
    impression_trend: List[Dict[str, Any]]


class AudienceEngagementInsightsOut(BaseModel):
    total_likes: int
    total_comments: int
    total_shares: Optional[int] = None
    total_saves: Optional[int] = None
    avg_engagement_rate: float
    interaction_trends: List[Dict[str, Any]]


class FollowerGrowthPoint(BaseModel):
    date: str
    youtube: int
    instagram: int
    tiktok: int
    facebook: int
    twitter: int
    linkedin: int
    total: int


class GrowthTrendOut(BaseModel):
    historical: List[Dict[str, Any]]
    forecast: List[Dict[str, Any]]
    total_growth_rate: float
    projected_reach: int


class HashtagTrend(BaseModel):
    tag: str
    posts_count: int
    avg_views: int
    engagement_rate: float
    trend: str
    avg_reach: Optional[str] = "Not Available"
    avg_impressions: Optional[str] = "Not Available"


class CategoryTrendOut(BaseModel):
    category: str
    avg_views: int
    avg_likes: int
    avg_comments: int
    avg_engagement_rate: float
    video_count: int


class ContentGrowthItemOut(BaseModel):
    id: int
    title: str
    published_at: datetime
    views_7d: int
    likes_30d: int
    watch_time_60d_hours: float
    growth_percentage: float
    is_fastest_growing: bool


class ReachPredictionOut(BaseModel):
    previous_reach: int
    avg_reach: int
    predicted_reach: int
    estimated_views: int
    estimated_engagement: float
    data_sufficient: bool
    message: Optional[str] = None


class AudienceForecastOut(BaseModel):
    current_followers: int
    avg_monthly_growth_rate: float
    expected_future_followers: int
    growth_percentage: float
    forecast_period_days: int
    data_sufficient: bool
    message: Optional[str] = None


class GrowthInsightOut(BaseModel):
    type: str
    title: str
    description: str
    metric: str
    impact: str


class FullGrowthAnalysisOut(BaseModel):
    growth_monitoring: Dict[str, Any]
    categories: List[CategoryTrendOut]
    best_category: Optional[str] = None
    hashtags: List[HashtagTrend]
    reach_prediction: ReachPredictionOut
    content_growth: List[ContentGrowthItemOut]
    audience_forecast: AudienceForecastOut
    insights: List[GrowthInsightOut]

