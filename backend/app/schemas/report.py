from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.models.report import (
    ReportType,
    ReportFormat,
    ReportStatus,
    NotificationType,
    ScheduledFrequency,
)


class ReportBase(BaseModel):
    name: str
    report_type: ReportType
    report_format: ReportFormat
    report_period_start: Optional[datetime] = None
    report_period_end: Optional[datetime] = None
    platform: Optional[str] = None
    platform_name: Optional[str] = None


class ReportCreate(ReportBase):
    social_account_id: Optional[int] = None


class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    report_data: Optional[Dict[str, Any]] = None
    downloaded_at: Optional[datetime] = None


class ReportOut(ReportBase):
    id: int
    user_id: int
    social_account_id: Optional[int] = None
    status: ReportStatus
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    report_data: Optional[Dict[str, Any]] = None
    generated_at: datetime
    downloaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportGenerateRequest(BaseModel):
    report_type: ReportType
    report_format: ReportFormat
    social_account_id: Optional[int] = None
    platform: Optional[str] = None
    report_period_start: Optional[datetime] = None
    report_period_end: Optional[datetime] = None
    name: Optional[str] = None


class NotificationBase(BaseModel):
    title: str
    notification_type: NotificationType
    details: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None


class NotificationOut(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScheduledReportBase(BaseModel):
    name: str
    report_type: ReportType
    report_format: ReportFormat
    frequency: ScheduledFrequency
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: str
    email_enabled: bool = False
    email_recipients: Optional[List[str]] = None


class ScheduledReportCreate(ScheduledReportBase):
    social_account_id: int


class ScheduledReportUpdate(BaseModel):
    name: Optional[str] = None
    report_type: Optional[ReportType] = None
    report_format: Optional[ReportFormat] = None
    frequency: Optional[ScheduledFrequency] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: Optional[str] = None
    is_active: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_recipients: Optional[List[str]] = None
    last_generated_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None


class ScheduledReportOut(ScheduledReportBase):
    id: int
    user_id: int
    social_account_id: int
    is_active: bool
    last_generated_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationCountOut(BaseModel):
    total: int
    unread: int
    by_type: Dict[str, int]


class ReportHistoryOut(BaseModel):
    reports: List[ReportOut]
    total: int
    page: int
    page_size: int


class ReportDeliveryOut(BaseModel):
    """Response for the report delivery endpoint (download -> notification -> email)."""
    success: bool
    title: str
    notification_id: Optional[int] = None
    report_id: Optional[int] = None
    format: str
    platform: str
    platform_name: str
    report_type: str
    report_period: str
    email_status: str  # "sent" | "failed" | "unavailable"
    email_message: str
    email_recipient: Optional[str] = None
    message: str