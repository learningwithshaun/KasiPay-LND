"""User model"""
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from .base import MongoBaseModel, ObjectIdStr


class UserRole(str, Enum):
    """User roles"""
    EARNER = "EARNER"
    OPERATOR = "OPERATOR"
    ADMIN = "ADMIN"


class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING = "PENDING"


class User(MongoBaseModel):
    """User document model"""
    
    phone: str = Field(..., description="Phone number (unique)")
    pin_hash: str = Field(..., description="Hashed PIN")
    display_name: str = Field(..., description="Display name")
    role: UserRole = Field(default=UserRole.EARNER)
    status: UserStatus = Field(default=UserStatus.ACTIVE)
    lightning_address: str | None = Field(default=None)
    
    def to_response(self) -> dict[str, Any]:
        """Convert to API response (exclude sensitive fields)"""
        return {
            "id": self.id,
            "phone": self.phone,
            "display_name": self.display_name,
            "role": self.role.value,
            "status": self.status.value,
            "lightning_address": self.lightning_address,
            "created_at": self.created_at.isoformat(),
        }


class UserCreate(BaseModel):
    """User creation request"""
    
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$")
    display_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    """User login request"""
    
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    pin: str = Field(..., min_length=4, max_length=6)


class TokenResponse(BaseModel):
    """Authentication token response"""
    
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]

