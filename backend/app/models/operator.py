"""Operator model - job approval permissions"""
from datetime import datetime, timezone
from enum import Enum

from pydantic import Field

from .base import MongoBaseModel


class OperatorPermission(str, Enum):
    """Operator permissions"""
    APPROVE_JOBS = "approve_jobs"
    REJECT_JOBS = "reject_jobs"
    VIEW_TREASURY = "view_treasury"
    MANAGE_CHANNELS = "manage_channels"


class OperatorStatus(str, Enum):
    """Operator status"""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


def get_next_reset_date() -> datetime:
    """Get next midnight UTC for daily reset"""
    tomorrow = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = tomorrow.replace(day=tomorrow.day + 1)
    return tomorrow


class Operator(MongoBaseModel):
    """Operator document model for job approval permissions"""
    
    user_id: str = Field(..., description="Reference to user")
    
    permissions: list[OperatorPermission] = Field(
        default_factory=lambda: [OperatorPermission.APPROVE_JOBS, OperatorPermission.REJECT_JOBS]
    )
    
    # Daily approval limits
    daily_approval_limit: int = Field(default=1_000_000, ge=0, description="Max sats per day")
    daily_approved: int = Field(default=0, ge=0, description="Running total")
    daily_reset_at: datetime = Field(default_factory=get_next_reset_date)
    
    status: OperatorStatus = Field(default=OperatorStatus.ACTIVE)

