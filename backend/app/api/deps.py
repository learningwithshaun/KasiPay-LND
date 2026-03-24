"""API dependencies - authentication and database access"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.database import get_database
from app.core.security import verify_token
from app.models.user import UserRole
from app.services.user_service import UserService

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    return {
        "user_id": payload.get("sub"),
        "role": UserRole(payload.get("role")),
    }


async def get_current_active_user(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """Verify user is active"""
    db = get_database()
    user_service = UserService(db)
    user = await user_service.get_by_id(current_user["user_id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if user.status.value != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )
    
    return current_user


def require_role(*roles: UserRole):
    """Dependency to require specific roles"""
    async def role_checker(
        current_user: Annotated[dict, Depends(get_current_active_user)],
    ) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    
    return role_checker


# Role-specific dependencies
RequireAdmin = Depends(require_role(UserRole.ADMIN))
RequireOperator = Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))
RequireEarner = Depends(require_role(UserRole.EARNER, UserRole.OPERATOR, UserRole.ADMIN))

