"""
CreatorIQ email service.

Sends report emails with file attachments over SMTP using credentials from
environment variables (SMTP_HOST / SMTP_PORT / SMTP_USERNAME / SMTP_PASSWORD /
SMTP_FROM_EMAIL). Credentials are never exposed to the frontend and are never
hardcoded.

The service never raises for delivery problems — it always returns an
EmailResult so callers can record an honest email_status:
    - "sent"         the SMTP server accepted the message
    - "failed"       SMTP was configured but delivery raised an error
    - "unavailable"  SMTP is not configured (no pretending)
"""
from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger("creatoriq.email")


@dataclass
class EmailResult:
    status: str  # "sent" | "failed" | "unavailable"
    message: str


def email_configured() -> bool:
    """Return True only when SMTP delivery is actually configured."""
    return bool(settings.SMTP_HOST and settings.SMTP_PORT)


def send_report_email(
    *,
    to_email: str,
    to_name: str,
    subject: str,
    body_text: str,
    attachment_bytes: bytes,
    attachment_filename: str,
    attachment_subtype: str,
) -> EmailResult:
    """
    Send an email with a single file attachment via SMTP.

    Returns an EmailResult; never raises.
    """
    if not email_configured():
        return EmailResult(
            status="unavailable",
            message="Email delivery unavailable — SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD/SMTP_FROM_EMAIL to enable email delivery.",
        )

    if not to_email:
        return EmailResult(
            status="failed",
            message="Email delivery failed — authenticated user has no email address.",
        )

    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = formataddr(("CreatorIQ", settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME or "noreply@creatoriq.app"))
        msg["To"] = to_email

        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        attachment = MIMEApplication(attachment_bytes, _subtype=attachment_subtype)
        attachment.add_header(
            "Content-Disposition",
            "attachment",
            filename=attachment_filename,
        )
        msg.attach(attachment)

        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()

        if settings.SMTP_USERNAME:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        from_address = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME or "noreply@creatoriq.app"
        server.sendmail(from_address, [to_email], msg.as_string())
        server.quit()

        logger.info("Report email sent to %s (subject=%r)", to_email, subject)
        return EmailResult(status="sent", message="Email sent successfully.")
    except Exception as exc:  # noqa: BLE001 — never crash the request for email issues
        logger.warning("Report email to %s failed: %s: %s", to_email, type(exc).__name__, exc)
        return EmailResult(
            status="failed",
            message=f"Email delivery failed ({type(exc).__name__}).",
        )
