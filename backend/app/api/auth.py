"""Authentication routes"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_database
from app.models.user import UserCreate, UserLogin, TokenResponse
from app.services.user_service import UserService
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """Register a new user"""
    db = get_database()
    user_service = UserService(db)
    
    try:
        result = await user_service.register(data)
        return {
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "token_type": result["token_type"],
            "user": result["user"],
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login with phone and PIN"""
    db = get_database()
    user_service = UserService(db)
    
    try:
        result = await user_service.login(data.phone, data.pin)
        return {
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "token_type": result["token_type"],
            "user": result["user"],
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/refresh")
async def refresh_token(current_user: Annotated[dict, Depends(get_current_user)]):
    """Refresh access token"""
    db = get_database()
    user_service = UserService(db)
    
    try:
        result = await user_service.refresh_token(current_user["user_id"])
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.get("/me")
async def get_me(current_user: Annotated[dict, Depends(get_current_user)]):
    """Get current user info"""
    db = get_database()
    user_service = UserService(db)
    
    user = await user_service.get_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return {"success": True, "user": user.to_response()}

