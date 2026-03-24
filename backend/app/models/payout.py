"""Payout model"""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import Field

from .base import MongoBaseModel


class PayoutStatus(str, Enum):
    """Payout status"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Payout(MongoBaseModel):
    """Payout document model"""
    
    job_id: str = Field(..., description="Reference to job")
    earner_id: str = Field(..., description="Reference to earner")
    
    amount_sats: int = Field(..., ge=1)
    amount_zar: float = Field(..., ge=0)
    
    status: PayoutStatus = Field(default=PayoutStatus.PENDING)
    
    # Idempotency
    idempotency_key: str | None = Field(default=None)
    
    # Lightning details
    payment_hash: str | None = Field(default=None)
    preimage: str | None = Field(default=None)
    fee_sats: int = Field(default=0, ge=0)
    
    # Timestamps
    initiated_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    failed_at: datetime | None = Field(default=None)
    failure_reason: str | None = Field(default=None)
    
    def to_response(self) -> dict[str, Any]:
        """Convert to API response"""
        return {
            "id": self.id,
            "job_id": self.job_id,
            "earner_id": self.earner_id,
            "amount_sats": self.amount_sats,
            "amount_zar": self.amount_zar,
            "status": self.status.value,
            "payment_hash": self.payment_hash,
            "preimage": self.preimage,
            "fee_sats": self.fee_sats,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

