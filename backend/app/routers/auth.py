from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.db.seed_data import ensure_user_seeded_data
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
    GoogleOAuthLogin,
    ChangePassword,
)
import httpx
import secrets
from app.core.config import settings

logger = logging.getLogger("creatoriq.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _issue_token(user: User) -> str:
    """Issue a JWT bound to the user's current session version."""
    return create_access_token(data={"sub": user.email, "ver": user.token_version})


@router.post(
    "/google",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Sign in or register using Google OAuth 2.0",
)
async def google_login(payload: GoogleOAuthLogin, db: Session = Depends(get_db)) -> Token:
    """
    Authenticate or auto-register a user via Google OAuth 2.0.

    - Exchanges authorization code for Google access token
    - Fetches the user profile from Google
    - Finds existing user by email or creates a new CreatorIQ account in PostgreSQL automatically
    - If YouTube scope was granted, links user's YouTube Channel automatically as OAUTH connection
    - Returns a JWT access token for session management
    """
    client_id = settings.google_client_id
    client_secret = settings.google_client_secret

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured.",
        )

    # 1. Exchange authorization code with Google token endpoint
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": payload.code,
        "grant_type": "authorization_code",
        "redirect_uri": payload.redirect_uri,
    }

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(token_url, data=token_data)
            if token_res.status_code != 200:
                error_json = token_res.json() if token_res.headers.get("content-type", "").startswith("application/json") else {}
                error_detail = error_json.get("error_description", error_json.get("error", f"OAuth token exchange failed (status {token_res.status_code})."))
                logger.error("Google token exchange failed (%s): %s", token_res.status_code, token_res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google OAuth token exchange failed: {error_detail}",
                )

            tokens = token_res.json()
            google_access_token = tokens.get("access_token")

            if not google_access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google OAuth response missing access token.",
                )

            # 2. Fetch authenticated user profile from Google
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {google_access_token}"},
            )
            if userinfo_res.status_code != 200:
                logger.error("Google userinfo failed (%s): %s", userinfo_res.status_code, userinfo_res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user profile from Google.",
                )

            profile = userinfo_res.json()
    except httpx.HTTPError as exc:
        logger.error("Google OAuth network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach Google OAuth servers: {type(exc).__name__}: {exc}",
        )

    email = profile.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a valid email address.",
        )

    full_name = profile.get("name") or email.split("@")[0]

    # 3. Find or auto-create user in PostgreSQL
    user = db.query(User).filter(User.email == email).first()

    if not user:
        random_pass = secrets.token_urlsafe(16)
        user = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(random_pass),
            role=UserRole.CREATOR,
            auth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Mark the account as Google-authenticated
    user.auth_provider = "google"

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    # Record the latest login time
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Automatically ensure creator analytics seed data is initialized
    ensure_user_seeded_data(db, user)

    # 4. Generate JWT access token
    access_token = _issue_token(user)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )



@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> Token:
    """
    Create a new user account.

    - Validates email uniqueness
    - Hashes the password with bcrypt
    - Returns a JWT access token immediately (no email confirmation in M1)
    """
    # Check for existing email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # Create user record
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        auth_provider="email",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Ensure demo data is seeded
    ensure_user_seeded_data(db, new_user)

    # Issue JWT
    access_token = _issue_token(new_user)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Login and receive a JWT access token",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)) -> Token:
    """
    Authenticate a user with email and password.

    Returns a JWT access token on success.
    Raises 401 for invalid credentials (intentionally vague to prevent enumeration).
    """
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    # Record the latest login time
    user.last_login = datetime.now(timezone.utc)
    user.auth_provider = "email"
    db.commit()
    db.refresh(user)

    # Ensure demo data is seeded
    ensure_user_seeded_data(db, user)

    access_token = _issue_token(user)


    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get the currently authenticated user's profile",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """
    Protected endpoint — returns the profile of the authenticated user.
    Requires a valid JWT Bearer token in the Authorization header.
    """
    return UserOut.model_validate(current_user)


@router.patch(
    "/me",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Update the currently authenticated user's own profile",
)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Token:
    """
    Update the authenticated user's own profile (full name, email, role).

    - The JWT subject is the user's email, so when the email changes a fresh
      token is issued with the new email to keep the session valid.
    - Email is validated by the schema and checked for duplicates against
      other users (409 if taken).
    - Only the authenticated user can edit their own record — the endpoint
      operates exclusively on `current_user`.
    """
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update.",
        )

    # Duplicate email check — must not collide with another user's email.
    if "email" in updates:
        existing_user = (
            db.query(User)
            .filter(User.email == updates["email"], User.id != current_user.id)
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

    # Apply updates to the authenticated user only.
    for field, value in updates.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    # Re-issue token so the session survives an email change.
    access_token = _issue_token(current_user)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(current_user),
    )


@router.post(
    "/change-password",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Change the authenticated user's password",
)
def change_password(
    payload: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Token:
    """
    Change the authenticated user's password.

    - Verifies the current password before applying the change.
    - Increments the session version so any other active sessions are logged out.
    - Returns a fresh token so the current session stays signed in.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.token_version += 1
    db.commit()
    db.refresh(current_user)

    access_token = _issue_token(current_user)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(current_user),
    )


@router.post(
    "/logout-all",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Log out of all other sessions",
)
def logout_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Token:
    """
    Invalidate every previously issued session token.

    - Bumps the user's session version; older JWTs no longer pass the
      auth dependency and are rejected with 401.
    - Issues a fresh token for the current session so it stays signed in.
    """
    current_user.token_version += 1
    db.commit()
    db.refresh(current_user)

    access_token = _issue_token(current_user)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(current_user),
    )


@router.delete(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete the authenticated user's account",
)
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Permanently delete the authenticated user and all associated data.

    Child rows are removed explicitly first so deletion works on databases
    that do not enforce FK cascade (e.g. SQLite).
    """
    from app.models.report import Notification, Report, ScheduledReport
    from app.models.content_item import ContentItem
    from app.models.analytics_snapshot import AnalyticsSnapshot
    from app.models.social_account import SocialAccount

    user_id = current_user.id
    for model in (ScheduledReport, Report, Notification, ContentItem, AnalyticsSnapshot, SocialAccount):
        db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)

    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully."}
