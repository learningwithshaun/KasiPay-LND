"""Approval service - operator verification and payment execution"""
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.job import JobStatus
from app.models.operator import Operator, OperatorPermission, OperatorStatus, get_next_reset_date
from app.services.job_service import JobService


class ApprovalService:
    """Operator approval and payment execution service"""
    
    def __init__(self, db: AsyncIOMotorDatabase, lnd_client: Any | None = None):
        self.db = db
        self.operators = db.operators
        self.jobs = db.jobs
        self.job_service = JobService(db)
        self.lnd_client = lnd_client
    
    async def get_or_create_operator(self, user_id: str) -> Operator:
        """Get or create operator record for a user"""
        doc = await self.operators.find_one({"user_id": user_id})
        
        if not doc:
            # Check if user has operator role
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if not user or user["role"] != "OPERATOR":
                raise ValueError("User is not an operator")
            
            operator = Operator(
                user_id=user_id,
                permissions=[OperatorPermission.APPROVE_JOBS, OperatorPermission.REJECT_JOBS],
                daily_approval_limit=1_000_000,
                status=OperatorStatus.ACTIVE,
            )
            await self.operators.insert_one(operator.to_mongo())
            return operator
        
        return Operator.from_mongo(doc)
    
    async def can_approve(self, operator_id: str, amount_sats: int) -> dict:
        """Check if operator can approve a job"""
        operator = await self.get_or_create_operator(operator_id)
        
        if operator.status != OperatorStatus.ACTIVE:
            return {"allowed": False, "reason": "Operator account is suspended"}
        
        if OperatorPermission.APPROVE_JOBS not in operator.permissions:
            return {"allowed": False, "reason": "Operator does not have approval permission"}
        
        # Reset daily counter if needed
        now = datetime.now(timezone.utc)
        if now >= operator.daily_reset_at:
            await self.operators.update_one(
                {"user_id": operator_id},
                {
                    "$set": {
                        "daily_approved": 0,
                        "daily_reset_at": get_next_reset_date(),
                    }
                },
            )
            operator.daily_approved = 0
        
        # Check daily limit
        if operator.daily_approved + amount_sats > operator.daily_approval_limit:
            remaining = operator.daily_approval_limit - operator.daily_approved
            return {
                "allowed": False,
                "reason": f"Would exceed daily approval limit. Remaining: {remaining} sats",
            }
        
        return {"allowed": True}
    
    async def approve_job(self, job_id: str, operator_id: str) -> dict:
        """Approve a job and trigger payment"""
        job = await self.job_service.get_by_id(job_id)
        if not job:
            return {"success": False, "error": "Job not found"}
        
        if job.status != JobStatus.SUBMITTED:
            return {"success": False, "error": f"Job is in {job.status.value} state, cannot approve"}
        
        if not job.invoice:
            return {"success": False, "error": "Job has no invoice"}
        
        # Check invoice not expired
        if job.invoice.expiry <= datetime.now(timezone.utc):
            await self.job_service.mark_expired(job_id)
            return {"success": False, "error": "Invoice has expired"}
        
        # Prevent self-approval
        if job.earner_id == operator_id:
            return {"success": False, "error": "Cannot approve your own job"}
        
        # Check operator can approve
        can_approve = await self.can_approve(operator_id, job.invoice.amount_sats)
        if not can_approve["allowed"]:
            return {"success": False, "error": can_approve["reason"]}
        
        # Mark job as approved
        try:
            await self.job_service.mark_approved(job_id, operator_id)
        except ValueError as e:
            return {"success": False, "error": str(e)}
        
        # Update operator daily total
        await self.operators.update_one(
            {"user_id": operator_id},
            {"$inc": {"daily_approved": job.invoice.amount_sats}},
        )
        
        # Execute payment
        payment_result = await self.execute_payment(job_id)
        
        return {
            "success": payment_result["success"],
            "job": (await self.job_service.get_by_id(job_id)).to_response() if await self.job_service.get_by_id(job_id) else None,
            "payment": payment_result,
            "error": payment_result.get("error") if not payment_result["success"] else None,
        }
    
    async def execute_payment(self, job_id: str) -> dict:
        """Execute payment for an approved job"""
        job = await self.job_service.get_by_id(job_id)
        if not job or not job.invoice:
            return {
                "success": False,
                "payment_hash": "",
                "error": "Job or invoice not found",
                "status": "FAILED",
            }
        
        # Mark as paying
        try:
            await self.job_service.mark_paying(job_id)
        except ValueError:
            return {
                "success": False,
                "payment_hash": job.invoice.payment_hash,
                "error": "Job state transition failed",
                "status": "FAILED",
            }
        
        # If no LND client, simulate payment (mock mode)
        if not self.lnd_client:
            # Mock successful payment
            import secrets
            mock_preimage = secrets.token_hex(32)
            await self.job_service.mark_paid(job_id, mock_preimage, fee_sats=0)
            
            return {
                "success": True,
                "payment_hash": job.invoice.payment_hash,
                "preimage": mock_preimage,
                "fee_sats": 0,
                "status": "SUCCEEDED",
            }
        
        # Real LND payment
        try:
            result = await self.lnd_client.send_payment(job.invoice.bolt11)
            
            if result["success"] and result.get("preimage"):
                await self.job_service.mark_paid(
                    job_id,
                    result["preimage"],
                    result.get("fee_sats", 0),
                )
                print(f"✓ Payment successful for job {job_id}: {result['preimage']}")
                return result
            else:
                await self.job_service.mark_failed(job_id, result.get("error", "Payment failed"))
                print(f"✗ Payment failed for job {job_id}: {result.get('error')}")
                return result
                
        except Exception as e:
            error_message = str(e)
            await self.job_service.mark_failed(job_id, error_message)
            print(f"✗ Payment error for job {job_id}: {e}")
            
            return {
                "success": False,
                "payment_hash": job.invoice.payment_hash,
                "error": error_message,
                "status": "FAILED",
            }
    
    async def reject_job(self, job_id: str, operator_id: str, reason: str) -> dict:
        """Reject a job"""
        operator = await self.get_or_create_operator(operator_id)
        if OperatorPermission.REJECT_JOBS not in operator.permissions:
            return {"success": False, "error": "Operator does not have rejection permission"}
        
        job = await self.job_service.get_by_id(job_id)
        if not job:
            return {"success": False, "error": "Job not found"}
        
        if job.earner_id == operator_id:
            return {"success": False, "error": "Cannot reject your own job"}
        
        try:
            updated_job = await self.job_service.mark_rejected(job_id, operator_id, reason)
            return {"success": True, "job": updated_job.to_response()}
        except ValueError as e:
            return {"success": False, "error": str(e)}
    
    async def get_operator_stats(self, operator_id: str) -> dict:
        """Get operator statistics"""
        operator = await self.get_or_create_operator(operator_id)
        
        # Reset daily counter if needed
        now = datetime.now(timezone.utc)
        if now >= operator.daily_reset_at:
            await self.operators.update_one(
                {"user_id": operator_id},
                {
                    "$set": {
                        "daily_approved": 0,
                        "daily_reset_at": get_next_reset_date(),
                    }
                },
            )
            operator.daily_approved = 0
        
        # Count approvals and rejections
        total_approvals = await self.jobs.count_documents({"approved_by": operator_id})
        total_rejections = await self.jobs.count_documents({"rejected_by": operator_id})
        
        return {
            "daily_approved": operator.daily_approved,
            "daily_limit": operator.daily_approval_limit,
            "daily_remaining": operator.daily_approval_limit - operator.daily_approved,
            "total_approvals": total_approvals,
            "total_rejections": total_rejections,
        }

