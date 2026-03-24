"""Task model"""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from .base import MongoBaseModel


class TaskStatus(str, Enum):
    """Task status"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"


class Task(MongoBaseModel):
    """Task document model"""
    
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    instructions: str | None = Field(default=None, max_length=5000)
    
    # Rewards
    reward_sats: int = Field(..., ge=1, description="Reward in satoshis")
    reward_zar: float = Field(..., ge=0, description="Reward in ZAR (display)")
    
    # Categorization
    category: str = Field(default="general")
    tags: list[str] = Field(default_factory=list)
    
    # Limits
    max_claims: int = Field(default=1, ge=1)
    current_claims: int = Field(default=0, ge=0)
    
    # Status and ownership
    status: TaskStatus = Field(default=TaskStatus.ACTIVE)
    created_by: str = Field(..., description="User ID of creator")
    
    # Expiry
    expires_at: datetime | None = Field(default=None)
    
    def to_response(self) -> dict[str, Any]:
        """Convert to API response"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "instructions": self.instructions,
            "reward_sats": self.reward_sats,
            "reward_zar": self.reward_zar,
            "category": self.category,
            "tags": self.tags,
            "max_claims": self.max_claims,
            "current_claims": self.current_claims,
            "available_slots": max(0, self.max_claims - self.current_claims),
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class TaskCreate(BaseModel):
    """Task creation request"""
    
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    instructions: str | None = Field(default=None, max_length=5000)
    reward_sats: int = Field(..., ge=1)
    reward_zar: float = Field(..., ge=0)
    category: str = Field(default="general")
    tags: list[str] = Field(default_factory=list)
    max_claims: int = Field(default=1, ge=1)

