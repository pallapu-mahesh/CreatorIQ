from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import TokenData

# OAuth2 scheme — points to the login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency — decodes the JWT token from the Authorization header
    and returns the authenticated User model instance.

    Raises 401 if token is missing, invalid, or expired.
    Raises 401 if the user no longer exists in the database.
    Raises 403 if the user account is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if not email:
        raise credentials_exception

    token_data = TokenData(email=email)

    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    # Reject tokens issued before the user's session version (used to log out
    # of all other sessions). Old tokens without a version default to 0.
    token_version = payload.get("ver", 0)
    if token_version != user.token_version:
        raise credentials_exception

    return user


def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that additionally requires the user to have the admin role.
    Extend this pattern for any role-restricted endpoint.
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
