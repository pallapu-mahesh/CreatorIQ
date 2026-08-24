import enum
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class ReportType(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"
    CUSTOM = "custom"


class ReportFormat(str, enum.Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"


class ReportStatus(str, enum.Enum):
    GENERATING = "generating"
    GENERATED = "generated"
    FAILED = "failed"
    DOWNLOADING = "downloading"


class NotificationType(str, enum.Enum):
    PERFORMANCE_ALERT = "performance_alert"
    REVENUE_NOTIFICATION = "revenue_notification"
    REPORT_READY = "report_ready"
    ACCOUNT_NOTIFICATION = "account_notification"
    SCHEDULED_REPORT = "scheduled_report"
    MILESTONE = "milestone"


class ScheduledFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    report_format = Column(Enum(ReportFormat), nullable=False)
    report_period_start = Column(DateTime(timezone=True), nullable=True)
    report_period_end = Column(DateTime(timezone=True), nullable=True)

    platform = Column(String(50), nullable=True)
    platform_name = Column(String(100), nullable=True)

    status = Column(Enum(ReportStatus), default=ReportStatus.GENERATING, nullable=False)
    file_path = Column(String(500), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    report_data = Column(JSON, nullable=True)

    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    downloaded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<Report id={self.id} user_id={self.user_id} type={self.report_type} format={self.report_format} status={self.status}>"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    details = Column(Text, nullable=True)
    data = Column(JSON, nullable=True)

    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user_id={self.user_id} type={self.notification_type} read={self.is_read}>"


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    report_format = Column(Enum(ReportFormat), nullable=False)
    frequency = Column(Enum(ScheduledFrequency), nullable=False)

    day_of_week = Column(Integer, nullable=True)
    day_of_month = Column(Integer, nullable=True)
    time_of_day = Column(String(5), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    last_generated_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    email_enabled = Column(Boolean, default=False, nullable=False)
    email_recipients = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<ScheduledReport id={self.id} user_id={self.user_id} frequency={self.frequency} active={self.is_active}>"