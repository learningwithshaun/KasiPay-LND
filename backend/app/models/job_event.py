"""Job Event model - append-only audit log for jobs"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from .base import MongoBaseModel


class JobEventType(str, Enum):
    """Job event types"""
    JOB_CREATED = "JOB_CREATED"
    INVOICE_SUBMITTED = "INVOICE_SUBMITTED"
    INVOICE_VALIDATED = "INVOICE_VALIDATED"
    INVOICE_EXPIRED = "INVOICE_EXPIRED"
    APPROVAL_REQUESTED = "APPROVAL_REQUESTED"
    JOB_APPROVED = "JOB_APPROVED"
    JOB_REJECTED = "JOB_REJECTED"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    HTLC_SETTLED = "HTLC_SETTLED"


class ActorType(str, Enum):
    """Actor types for audit events"""
    USER = "USER"
    OPERATOR = "OPERATOR"
    SYSTEM = "SYSTEM"


class JobEvent(MongoBaseModel):
    """Job event document for audit log (append-only)"""
    
    event_type: JobEventType = Field(...)
    job_id: str = Field(...)
    
    # Event payload (varies by event type)
    payload: dict[str, Any] = Field(default_factory=dict)
    
    # Actor info
    actor_id: str | None = Field(default=None)
    actor_type: ActorType = Field(default=ActorType.SYSTEM)
    
    # Metadata
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = Field(..., ge=1, description="Event version for optimistic concurrency")
    
    def to_response(self) -> dict[str, Any]:
        """Convert to API response"""
        return {
            "type": self.event_type.value,
            "job_id": self.job_id,
            "payload": self.payload,
            "actor_type": self.actor_type.value,
            "timestamp": self.timestamp.isoformat(),
        }

