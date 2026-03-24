"""Lightning Job model - tracks task claims with invoice workflow"""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from .base import MongoBaseModel


class JobStatus(str, Enum):
    """Job state machine states"""
    CLAIMED = "CLAIMED"      # User claimed task, no invoice yet
    SUBMITTED = "SUBMITTED"  # Invoice submitted, awaiting approval
    APPROVED = "APPROVED"    # Operator approved, payment authorized
    PAYING = "PAYING"        # Payment in flight
    PAID = "PAID"            # Payment confirmed (terminal)
    REJECTED = "REJECTED"    # Operator rejected (terminal)
    EXPIRED = "EXPIRED"      # Invoice expired
    FAILED = "FAILED"        # Payment failed


class InvoiceData(BaseModel):
    """Lightning invoice data embedded in Job"""
    
    bolt11: str = Field(..., description="Full BOLT11 invoice string")
    payment_hash: str = Field(..., description="Hex-encoded payment hash")
    amount_sats: int = Field(..., ge=1, description="Invoice amount in sats")
    expiry: datetime = Field(..., description="When invoice expires")
    description: str = Field(default="", description="Invoice memo")
    destination: str = Field(..., description="Destination node pubkey")


class SettlementData(BaseModel):
    """Payment settlement data"""
    
    preimage: str = Field(..., description="Hex-encoded preimage (proof of payment)")
    settled_at: datetime = Field(...)
    fee_sats: int = Field(default=0, ge=0, description="Routing fee paid")


class Job(MongoBaseModel):
    """Lightning Job document model"""
    
    task_id: str = Field(..., description="Reference to task")
    earner_id: str = Field(..., description="User who claimed the job")
    
    # Invoice data (populated when user submits invoice)
    invoice: InvoiceData | None = Field(default=None)
    
    # State machine
    status: JobStatus = Field(default=JobStatus.CLAIMED)
    
    # Settlement data (populated after payment)
    settlement: SettlementData | None = Field(default=None)
    
    # Timestamps
    submitted_at: datetime | None = Field(default=None)
    approved_at: datetime | None = Field(default=None)
    approved_by: str | None = Field(default=None)
    rejected_at: datetime | None = Field(default=None)
    rejected_by: str | None = Field(default=None)
    rejection_reason: str | None = Field(default=None)
    paying_at: datetime | None = Field(default=None)
    paid_at: datetime | None = Field(default=None)
    expired_at: datetime | None = Field(default=None)
    failed_at: datetime | None = Field(default=None)
    failure_reason: str | None = Field(default=None)
    
    def to_response(self, include_invoice: bool = False) -> dict[str, Any]:
        """Convert to API response"""
        response = {
            "id": self.id,
            "task_id": self.task_id,
            "earner_id": self.earner_id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }
        
        if self.invoice:
            response["invoice"] = {
                "payment_hash": self.invoice.payment_hash,
                "amount_sats": self.invoice.amount_sats,
                "expiry": self.invoice.expiry.isoformat(),
            }
            if include_invoice:
                response["invoice"]["bolt11"] = self.invoice.bolt11
        
        if self.settlement:
            response["settlement"] = {
                "preimage": self.settlement.preimage,
                "settled_at": self.settlement.settled_at.isoformat(),
                "fee_sats": self.settlement.fee_sats,
            }
        
        if self.rejection_reason:
            response["rejection_reason"] = self.rejection_reason
        
        if self.failure_reason:
            response["failure_reason"] = self.failure_reason
        
        return response


class JobCreate(BaseModel):
    """Job creation request"""
    
    task_id: str = Field(...)


class InvoiceSubmit(BaseModel):
    """Invoice submission request"""
    
    bolt11: str = Field(..., pattern=r"^ln(bc|tb|bcrt)")

