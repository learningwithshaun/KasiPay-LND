"""Security utilities: JWT tokens and password hashing"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_pin(pin: str) -> str:
    """Hash a PIN using bcrypt"""
    return pwd_context.hash(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verify a PIN against its hash"""
    return pwd_context.verify(plain_pin, hashed_pin)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_refresh_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str, token_type: str = "access") -> dict[str, Any] | None:
    """Verify a JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        
        if payload.get("type") != token_type:
            return None
        
        return payload
    except JWTError:
        return None

