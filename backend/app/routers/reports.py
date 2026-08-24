from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.social_account import SocialAccount
from app.models.report import (
    Report,
    Notification,
    ScheduledReport,
    ReportType,
    ReportFormat,
    ReportStatus,
    NotificationType,
    ScheduledFrequency,
)
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportOut,
    ReportGenerateRequest,
    ReportDeliveryOut,
    NotificationBase,
    NotificationCreate,
    NotificationUpdate,
    NotificationOut,
    NotificationCountOut,
    ScheduledReportCreate,
    ScheduledReportUpdate,
    ScheduledReportOut,
    ReportHistoryOut,
)
from app.services.email_service import send_report_email, email_configured
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Form, File, UploadFile


router = APIRouter(prefix="/api/reports", tags=["Module 7 Reports & Notifications"])


def _get_active_platform(db: Session, user_id: int, social_account_id: Optional[int] = None) -> Optional[SocialAccount]:
    """Get the active social account for the user."""
    query = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.is_connected == True,
    )
    if social_account_id:
        query = query.filter(SocialAccount.id == social_account_id)
    return query.order_by(desc(SocialAccount.last_synced_at)).first()


def _build_report_data(platform: str, social_account_id: Optional[int], db: Session, user_id: int) -> Dict[str, Any]:
    """Build comprehensive report data from existing analytics data."""
    # Get the active social account
    account = _get_active_platform(db, user_id, social_account_id)
    if not account:
        return {}

    # Get content items for this platform
    from app.services.content_service import content_service
    from app.services.audience_service import audience_service

    items = content_service.get_content_items(
        db=db,
        user_id=user_id,
        social_account_id=social_account_id if account and account.id else None,
        platform=platform.lower(),
        date_range="all",
    )

    # Calculate KPIs
    total_views = sum(i.views or 0 for i in items)
    total_likes = sum(i.likes or 0 for i in items)
    total_comments = sum(i.comments or 0 for i in items)
    total_shares = sum(i.shares or 0 for i in items)
    total_saves = sum(i.saves or 0 for i in items if i.saves is not None)
    total_watch_min = sum(i.watch_time_minutes or 0.0 for i in items)
    total_watch_time_hours = round(total_watch_min / 60.0, 1)
    total_reach = sum(i.reach for i in items if i.reach is not None)

    # Calculate engagement rate
    avg_engagement_rate = round(sum(i.engagement_rate or 0.0 for i in items) / len(items), 2) if items else 0.0

    # Get audience overview
    audience = audience_service.get_audience_overview(
        db=db,
        user_id=user_id,
        social_account_id=social_account_id if account and account.id else None,
        platform=platform.lower(),
    )

    # Get top performing content
    top_content = sorted(items, key=lambda i: i.views or 0, reverse=True)[:5]

    # Calculate growth trends
    now = datetime.now(timezone.utc)
    prev = content_service._aggregate(
        db=db,
        user_id=user_id,
        social_account_id=social_account_id if account and account.id else None,
        platform=platform.lower(),
        start=now - timedelta(days=90),
        end=now - timedelta(days=30),
    ) if len(items) > 1 else {"views": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0, "watch_min": 0, "reach": 0, "eng": 0.0}

    views_change_pct = round((total_views - prev["views"]) / prev["views"] * 100.0, 1) if prev["views"] else 0.0
    likes_change_pct = round((total_likes - prev["likes"]) / prev["likes"] * 100.0, 1) if prev["likes"] else 0.0
    comments_change_pct = round((total_comments - prev["comments"]) / prev["comments"] * 100.0, 1) if prev["comments"] else 0.0
    shares_change_pct = round((total_shares - prev["shares"]) / prev["shares"] * 100.0, 1) if prev["shares"] else 0.0
    saves_change_pct = round((total_saves - prev["saves"]) / prev["saves"] * 100.0, 1) if prev["saves"] else None
    watch_time_change_pct = round((total_watch_min - prev["watch_min"]) / prev["watch_min"] * 100.0, 1) if prev["watch_min"] else 0.0
    reach_change_pct = round((total_reach - prev["reach"]) / prev["reach"] * 100.0, 1) if prev["reach"] else None
    engagement_change_pct = round((avg_engagement_rate - prev["eng"]) / prev["eng"] * 100.0, 1) if prev["eng"] else 0.0

    return {
        "total_views": total_views,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "total_saves": total_saves,
        "total_watch_time_hours": total_watch_time_hours,
        "total_reach": total_reach,
        "avg_engagement_rate": avg_engagement_rate,
        "views_change_pct": views_change_pct,
        "likes_change_pct": likes_change_pct,
        "comments_change_pct": comments_change_pct,
        "shares_change_pct": shares_change_pct,
        "saves_change_pct": saves_change_pct,
        "watch_time_change_pct": watch_time_change_pct,
        "reach_change_pct": reach_change_pct,
        "engagement_change_pct": engagement_change_pct,
        "audience_overview": audience,
        "top_content": [
            {
                "id": c.id,
                "title": c.title,
                "views": c.views,
                "likes": c.likes,
                "comments": c.comments,
                "shares": c.shares,
                "saves": c.saves,
                "watch_time_minutes": c.watch_time_minutes,
                "reach": c.reach,
                "published_at": c.published_at.isoformat() if c.published_at else None,
            }
            for c in top_content
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/generate", response_model=ReportOut)
def generate_report(
    req: ReportGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a report for the active platform."""
    # Ensure user seeded data exists
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    # Get active platform
    social_account_id = req.social_account_id
    if not social_account_id:
        account = _get_active_platform(db, current_user.id)
        if not account:
            raise HTTPException(status_code=400, detail="No active platform connected")
        social_account_id = account.id

    # Verify the social account belongs to the user and is connected
    account = db.query(SocialAccount).filter(
        SocialAccount.id == social_account_id,
        SocialAccount.user_id == current_user.id,
        SocialAccount.is_connected == True,
    ).first()
    if not account:
        raise HTTPException(status_code=400, detail="No active platform connected for this user")

    # Build report data
    report_data = _build_report_data(account.platform.value, social_account_id, db, current_user.id)

    # Create report record
    report_name = req.name or f"{account.title} — {req.report_type.value.title()} Report"
    new_report = Report(
        user_id=current_user.id,
        social_account_id=social_account_id,
        name=report_name,
        report_type=req.report_type,
        report_format=req.report_format,
        platform=account.platform.value,
        platform_name=account.platform_name,
        status=ReportStatus.GENERATING,
        report_data=report_data,
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Simulate report generation in background (async)
    # In production, this would be a real background job
    def generate_report_background():
        import time
        time.sleep(1)  # Simulate processing time
        # Update report status to generated
        new_report.status = ReportStatus.GENERATED
        new_report.generated_at = datetime.now(timezone.utc)
        new_report.error_message = None
        # In a real implementation, we'd generate the actual PDF/Excel file
        # and set file_path accordingly
        db.commit()

    background_tasks.add_task(generate_report_background)

    return ReportOut.from_orm(new_report)


@router.get("/", response_model=List[ReportOut])
def list_reports(
    report_type: Optional[ReportType] = Query(None),
    platform: Optional[str] = Query(None),
    status: Optional[ReportStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all reports for the authenticated user."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    query = db.query(Report).filter(Report.user_id == current_user.id)

    if report_type:
        query = query.filter(Report.report_type == report_type)
    if platform:
        query = query.filter(Report.platform == platform)
    if status:
        query = query.filter(Report.status == status)

    reports = query.order_by(desc(Report.generated_at)).all()
    return [ReportOut.from_orm(r) for r in reports]


@router.get("/history", response_model=ReportHistoryOut)
def get_report_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated report history."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    query = db.query(Report).filter(Report.user_id == current_user.id)
    total = query.count()
    reports = query.order_by(desc(Report.generated_at)).offset((page - 1) * page_size).limit(page_size).all()

    return ReportHistoryOut(
        reports=[ReportOut.from_orm(r) for r in reports],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{report_id}/download", response_model=ReportOut)
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark report as downloaded."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = ReportStatus.DOWNLOADING
    report.downloaded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)

    return ReportOut.from_orm(report)


# --------------------- NOTIFICATIONS ---------------------

@router.post("/notifications", response_model=NotificationOut)
def create_notification(
    req: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new notification for the user."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    new_notification = Notification(
        user_id=current_user.id,
        title=req.title,
        notification_type=req.notification_type,
        details=req.details,
        data=req.data,
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    return NotificationOut.from_orm(new_notification)


@router.get("/notifications", response_model=List[NotificationOut])
def list_notifications(
    is_read: Optional[bool] = Query(None),
    notification_type: Optional[NotificationType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the authenticated user."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)

    return query.order_by(desc(Notification.created_at)).all()


@router.put("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)

    return NotificationOut.from_orm(notification)


@router.put("/notifications/read-all", response_model=List[NotificationOut])
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True, "read_at": datetime.now(timezone.utc)}, synchronize_session=False)
    db.commit()

    return query_notifications_unread(db, current_user.id)


def query_notifications_unread(user_id: int, db: Session):
    """Helper to get unread count."""
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).count()

    total_count = db.query(Notification).filter(Notification.user_id == user_id).count()

    by_type: Dict[str, int] = {}
    for nt in NotificationType:
        ct = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.notification_type == nt,
            Notification.is_read == False,
        ).count()
        by_type[nt.value] = ct

    return {
        "total": total_count,
        "unread": unread_count,
        "by_type": {k: v for k, v in by_type.items() if v > 0},
    }


@router.get("/notifications/count", response_model=NotificationCountOut)
def get_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notification count and unread status."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    result = query_notifications_unread(current_user.id, db)
    return NotificationCountOut(**result)


# --------------------- SCHEDULED REPORTS ---------------------

@router.post("/scheduled", response_model=ScheduledReportOut)
def create_scheduled_report(
    req: ScheduledReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a scheduled report."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    # Verify social account exists and belongs to user
    account = db.query(SocialAccount).filter(
        SocialAccount.id == req.social_account_id,
        SocialAccount.user_id == current_user.id,
        SocialAccount.is_connected == True,
    ).first()
    if not account:
        raise HTTPException(status_code=400, detail="Social account not found or not connected")

    new_scheduled = ScheduledReport(
        user_id=current_user.id,
        social_account_id=req.social_account_id,
        name=req.name,
        report_type=req.report_type,
        report_format=req.report_format,
        frequency=req.frequency,
        day_of_week=req.day_of_week,
        day_of_month=req.day_of_month,
        time_of_day=req.time_of_day,
        email_enabled=req.email_enabled,
        email_recipients=req.email_recipients,
    )

    db.add(new_scheduled)
    db.commit()
    db.refresh(new_scheduled)

    return ScheduledReportOut.from_orm(new_scheduled)


@router.get("/scheduled", response_model=List[ScheduledReportOut])
def list_scheduled_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all scheduled reports for the user."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    return db.query(ScheduledReport).filter(
        ScheduledReport.user_id == current_user.id,
    ).order_by(desc(ScheduledReport.created_at)).all()


@router.put("/scheduled/{scheduled_id}", response_model=ScheduledReportOut)
def update_scheduled_report(
    scheduled_id: int,
    req: ScheduledReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a scheduled report."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    scheduled = db.query(ScheduledReport).filter(
        ScheduledReport.id == scheduled_id,
        ScheduledReport.user_id == current_user.id,
    ).first()
    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(scheduled, key, value)

    db.commit()
    db.refresh(scheduled)

    return ScheduledReportOut.from_orm(scheduled)


@router.delete("/scheduled/{scheduled_id}")
def delete_scheduled_report(
    scheduled_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a scheduled report."""
    from app.db.seed_data import ensure_user_seeded_data
    ensure_user_seeded_data(db, current_user)

    scheduled = db.query(ScheduledReport).filter(
        ScheduledReport.id == scheduled_id,
        ScheduledReport.user_id == current_user.id,
    ).first()
    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    db.delete(scheduled)
    db.commit()

    return {"detail": "Scheduled report deleted successfully"}


# --------------------- REPORT DELIVERY (download -> notification -> email) ---------------------

PLATFORM_DISPLAY_NAMES = {
    "youtube": "YouTube",
    "instagram": "Instagram",
    "facebook": "Facebook",
    "linkedin": "LinkedIn",
    "twitter": "X (Twitter)",
    "tiktok": "TikTok",
}


def _map_report_type(value: str) -> ReportType:
    v = (value or "").lower()
    if "weekly" in v:
        return ReportType.WEEKLY
    if "quarterly" in v:
        return ReportType.QUARTERLY
    if "annual" in v:
        return ReportType.ANNUAL
    if "monthly" in v:
        return ReportType.MONTHLY
    return ReportType.MONTHLY


def _map_report_format(value: str) -> ReportFormat:
    v = (value or "").lower()
    if v in ("excel", "xlsx", "xls", "csv"):
        return ReportFormat.EXCEL
    return ReportFormat.PDF


@router.post("/deliver", response_model=ReportDeliveryOut)
async def deliver_report(
    platform: str = Form(""),
    platform_name: str = Form(""),
    report_type: str = Form("Monthly Summary"),
    report_period: str = Form(""),
    report_name: str = Form(""),
    account_name: str = Form(""),
    format: str = Form("pdf"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authenticated report delivery workflow.

    1. The authenticated user (resolved from the JWT — never from the request
       body) generated a report file (PDF/Excel) for the active platform.
    2. This endpoint persists the download in the Reports table, creates a
       "Report Downloaded Successfully" notification for that user, and emails
       the same file to the user's own stored email address (SMTP).
    3. Returns an honest email_status: "sent", "failed", or "unavailable".

    The email recipient is ALWAYS the authenticated user's email from the
    database. The frontend cannot choose another recipient.
    """
    # File must actually exist (never claim success for a missing file).
    file_bytes = await file.read()
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Report file is empty.")

    fmt = (format or "pdf").lower()
    if fmt not in ("pdf", "excel", "xlsx"):
        fmt = "pdf"
    fmt_label = "PDF" if fmt in ("pdf",) else "Excel"
    platform_id = (platform or "").strip().lower()
    display_name = (platform_name or "").strip() or PLATFORM_DISPLAY_NAMES.get(platform_id, platform_id.capitalize() or "Platform")
    report_type_label = (report_type or "Monthly Summary").strip()
    period = (report_period or "").strip() or "Current Period"
    account = (account_name or "").strip() or display_name
    name = (report_name or "").strip() or f"{account} — {report_type_label}"

    title = f"{fmt_label} Report Downloaded Successfully"

    # ── 1. Send the report to the authenticated user's email (SMTP) ────────
    subject = f"CreatorIQ — {display_name} {report_type_label}"
    body = (
        f"Hello {current_user.full_name},\n\n"
        f"Your CreatorIQ {display_name} {report_type_label} report has been generated successfully.\n\n"
        f"Report:\n{name}\n\n"
        f"Platform:\n{display_name}\n\n"
        f"Period:\n{period}\n\n"
        f"The {fmt_label} report is attached to this email.\n\n"
        f"Regards,\nCreatorIQ"
    )
    attachment_filename = f"{platform_id or 'creatoriq'}_report_{report_type_label.lower().replace(' ', '_')}.{ 'pdf' if fmt == 'pdf' else 'xlsx'}"
    attachment_subtype = "pdf" if fmt == "pdf" else "vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    email_result = send_report_email(
        to_email=current_user.email,
        to_name=current_user.full_name,
        subject=subject,
        body_text=body,
        attachment_bytes=file_bytes,
        attachment_filename=attachment_filename,
        attachment_subtype=attachment_subtype,
    )

    # ── 2. Persist the notification for the authenticated user ─────────────
    message = (
        f"Your {report_type_label} report for {display_name} has been downloaded successfully."
        f" Report period: {period}."
    )
    notification = Notification(
        user_id=current_user.id,
        title=title,
        notification_type=NotificationType.REPORT_READY,
        details=message,
        data={
            "platform": platform_id,
            "platform_name": display_name,
            "report_type": report_type_label,
            "report_period": period,
            "report_name": name,
            "account_name": account,
            "format": fmt,
            "email_status": email_result.status,
            "email_message": email_result.message,
            "email_recipient": current_user.email,
            "user_email": current_user.email,
        },
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # ── 3. Persist the report in history for the authenticated user ────────
    report = Report(
        user_id=current_user.id,
        name=name,
        report_type=_map_report_type(report_type_label),
        report_format=_map_report_format(fmt),
        platform=platform_id or None,
        platform_name=display_name,
        status=ReportStatus.GENERATED,
        downloaded_at=datetime.now(timezone.utc),
        report_data={
            "report_period": period,
            "account_name": account,
            "user_email": current_user.email,
            "email_status": email_result.status,
            "email_message": email_result.message,
            "file_size_bytes": len(file_bytes),
        },
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    logger = __import__("logging").getLogger("creatoriq.reports")
    logger.info(
        "Report delivered user_id=%s platform=%s format=%s email_status=%s",
        current_user.id,
        platform_id,
        fmt,
        email_result.status,
    )

    return ReportDeliveryOut(
        success=True,
        title=title,
        notification_id=notification.id,
        report_id=report.id,
        format=fmt,
        platform=platform_id,
        platform_name=display_name,
        report_type=report_type_label,
        report_period=period,
        email_status=email_result.status,
        email_message=email_result.message,
        email_recipient=current_user.email,
        message=message,
    )