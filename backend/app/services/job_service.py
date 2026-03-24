"""Job service - Lightning job lifecycle management"""
from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.lnd.invoice_decoder import decode_invoice, validate_invoice
from app.models.job import Job, JobStatus, InvoiceData, SettlementData
from app.models.job_event import JobEvent, JobEventType, ActorType


class JobService:
    """Lightning job lifecycle service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.jobs = db.jobs
        self.events = db.job_events
        self.tasks = db.tasks
    
    async def create_job(self, task_id: str, earner_id: str) -> Job:
        """Create a new job (user claims a task)"""
        # Verify task exists and is active
        task = await self.tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            raise ValueError("Task not found")
        
        if task["status"] != "ACTIVE":
            raise ValueError("Task is not available")
        
        if task["current_claims"] >= task["max_claims"]:
            raise ValueError("Task has reached maximum claims")
        
        # Check for existing active job
        existing = await self.jobs.find_one({
            "task_id": task_id,
            "earner_id": earner_id,
            "status": {"$nin": [JobStatus.REJECTED.value, JobStatus.EXPIRED.value, JobStatus.FAILED.value]},
        })
        if existing:
            raise ValueError("You already have an active job for this task")
        
        # Create job
        job = Job(
            task_id=task_id,
            earner_id=earner_id,
            status=JobStatus.CLAIMED,
        )
        
        await self.jobs.insert_one(job.to_mongo())
        
        # Increment task claims
        await self.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$inc": {"current_claims": 1}},
        )
        
        # Log event
        await self._log_event(
            job.id, JobEventType.JOB_CREATED,
            {"task_id": task_id},
            earner_id, ActorType.USER,
        )
        
        return job
    
    async def submit_invoice(self, job_id: str, bolt11: str, earner_id: str) -> Job:
        """Submit a Lightning invoice for a job"""
        job_doc = await self.jobs.find_one({
            "_id": ObjectId(job_id),
            "earner_id": earner_id,
        })
        if not job_doc:
            raise ValueError("Job not found")
        
        job = Job.from_mongo(job_doc)
        
        if job.status not in [JobStatus.CLAIMED, JobStatus.FAILED]:
            raise ValueError(f"Cannot submit invoice for job in {job.status.value} state")
        
        # Get task to verify amount
        task = await self.tasks.find_one({"_id": ObjectId(job.task_id)})
        if not task:
            raise ValueError("Task not found")
        
        # Decode invoice
        decoded = decode_invoice(bolt11)
        
        # Validate invoice
        validation = validate_invoice(decoded, task["reward_sats"])
        if not validation["valid"]:
            raise ValueError(validation["error"])
        
        # Check payment hash uniqueness
        existing = await self.jobs.find_one({
            "invoice.payment_hash": decoded["payment_hash"],
            "_id": {"$ne": ObjectId(job_id)},
        })
        if existing:
            raise ValueError("This invoice has already been submitted for another job")
        
        # Update job
        invoice_data = InvoiceData(
            bolt11=bolt11,
            payment_hash=decoded["payment_hash"],
            amount_sats=decoded["amount_sats"],
            expiry=decoded["expiry_date"],
            description=decoded.get("description", ""),
            destination=decoded["destination"],
        )
        
        now = datetime.now(timezone.utc)
        await self.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "invoice": invoice_data.model_dump(),
                    "status": JobStatus.SUBMITTED.value,
                    "submitted_at": now,
                    "failed_at": None,
                    "failure_reason": None,
                    "updated_at": now,
                }
            },
        )
        
        # Log events
        await self._log_event(
            job_id, JobEventType.INVOICE_SUBMITTED,
            {
                "payment_hash": decoded["payment_hash"],
                "amount_sats": decoded["amount_sats"],
                "destination": decoded["destination"],
            },
            earner_id, ActorType.USER,
        )
        
        await self._log_event(
            job_id, JobEventType.INVOICE_VALIDATED,
            {"payment_hash": decoded["payment_hash"]},
            actor_type=ActorType.SYSTEM,
        )
        
        # Return updated job
        updated = await self.jobs.find_one({"_id": ObjectId(job_id)})
        return Job.from_mongo(updated)
    
    async def get_by_id(self, job_id: str) -> Job | None:
        """Get job by ID"""
        doc = await self.jobs.find_one({"_id": ObjectId(job_id)})
        return Job.from_mongo(doc) if doc else None
    
    async def get_earner_jobs(
        self,
        earner_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Job], int]:
        """Get jobs for an earner"""
        query = {"earner_id": earner_id}
        
        total = await self.jobs.count_documents(query)
        cursor = self.jobs.find(query).skip(skip).limit(limit).sort("created_at", -1)
        jobs = [Job.from_mongo(doc) async for doc in cursor]
        
        return jobs, total
    
    async def get_pending_jobs(self) -> list[Job]:
        """Get jobs pending approval"""
        cursor = self.jobs.find({"status": JobStatus.SUBMITTED.value}).sort("submitted_at", 1)
        return [Job.from_mongo(doc) async for doc in cursor]
    
    async def mark_approved(self, job_id: str, operator_id: str) -> Job:
        """Mark job as approved"""
        now = datetime.now(timezone.utc)
        result = await self.jobs.find_one_and_update(
            {"_id": ObjectId(job_id), "status": JobStatus.SUBMITTED.value},
            {
                "$set": {
                    "status": JobStatus.APPROVED.value,
                    "approved_at": now,
                    "approved_by": operator_id,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise ValueError("Job not found or not in SUBMITTED state")
        
        await self._log_event(
            job_id, JobEventType.JOB_APPROVED,
            {"operator_id": operator_id},
            operator_id, ActorType.OPERATOR,
        )
        
        return Job.from_mongo(result)
    
    async def mark_paying(self, job_id: str) -> Job:
        """Mark job as paying (payment initiated)"""
        now = datetime.now(timezone.utc)
        result = await self.jobs.find_one_and_update(
            {"_id": ObjectId(job_id), "status": JobStatus.APPROVED.value},
            {
                "$set": {
                    "status": JobStatus.PAYING.value,
                    "paying_at": now,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise ValueError("Job not found or not in APPROVED state")
        
        job = Job.from_mongo(result)
        
        await self._log_event(
            job_id, JobEventType.PAYMENT_INITIATED,
            {
                "payment_hash": job.invoice.payment_hash if job.invoice else None,
                "amount_sats": job.invoice.amount_sats if job.invoice else None,
            },
            actor_type=ActorType.SYSTEM,
        )
        
        return job
    
    async def mark_paid(self, job_id: str, preimage: str, fee_sats: int = 0) -> Job:
        """Mark job as paid (HTLC settled)"""
        now = datetime.now(timezone.utc)
        
        settlement = SettlementData(
            preimage=preimage,
            settled_at=now,
            fee_sats=fee_sats,
        )
        
        result = await self.jobs.find_one_and_update(
            {"_id": ObjectId(job_id), "status": JobStatus.PAYING.value},
            {
                "$set": {
                    "status": JobStatus.PAID.value,
                    "paid_at": now,
                    "settlement": settlement.model_dump(),
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise ValueError("Job not found or not in PAYING state")
        
        job = Job.from_mongo(result)
        
        await self._log_event(
            job_id, JobEventType.HTLC_SETTLED,
            {"preimage": preimage, "fee_sats": fee_sats},
            actor_type=ActorType.SYSTEM,
        )
        
        await self._log_event(
            job_id, JobEventType.PAYMENT_SUCCEEDED,
            {
                "payment_hash": job.invoice.payment_hash if job.invoice else None,
                "amount_sats": job.invoice.amount_sats if job.invoice else None,
            },
            actor_type=ActorType.SYSTEM,
        )
        
        return job
    
    async def mark_rejected(self, job_id: str, operator_id: str, reason: str) -> Job:
        """Mark job as rejected"""
        now = datetime.now(timezone.utc)
        result = await self.jobs.find_one_and_update(
            {"_id": ObjectId(job_id), "status": JobStatus.SUBMITTED.value},
            {
                "$set": {
                    "status": JobStatus.REJECTED.value,
                    "rejected_at": now,
                    "rejected_by": operator_id,
                    "rejection_reason": reason,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise ValueError("Job not found or not in SUBMITTED state")
        
        await self._log_event(
            job_id, JobEventType.JOB_REJECTED,
            {"operator_id": operator_id, "reason": reason},
            operator_id, ActorType.OPERATOR,
        )
        
        return Job.from_mongo(result)
    
    async def mark_failed(self, job_id: str, reason: str) -> Job:
        """Mark job as failed (payment failed)"""
        now = datetime.now(timezone.utc)
        result = await self.jobs.find_one_and_update(
            {"_id": ObjectId(job_id), "status": {"$in": [JobStatus.APPROVED.value, JobStatus.PAYING.value]}},
            {
                "$set": {
                    "status": JobStatus.FAILED.value,
                    "failed_at": now,
                    "failure_reason": reason,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise ValueError("Job not found or not in payment state")
        
        job = Job.from_mongo(result)
        
        await self._log_event(
            job_id, JobEventType.PAYMENT_FAILED,
            {
                "payment_hash": job.invoice.payment_hash if job.invoice else None,
                "error": reason,
            },
            actor_type=ActorType.SYSTEM,
        )
        
        return job
    
    async def mark_expired(self, job_id: str) -> Job:
        """Mark job as expired"""
        now = datetime.now(timezone.utc)
        result = await self.jobs.find_one_and_update(
            {"_id": ObjectId(job_id), "status": {"$in": [JobStatus.CLAIMED.value, JobStatus.SUBMITTED.value]}},
            {
                "$set": {
                    "status": JobStatus.EXPIRED.value,
                    "expired_at": now,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise ValueError("Job not found or not in expirable state")
        
        job = Job.from_mongo(result)
        
        await self._log_event(
            job_id, JobEventType.INVOICE_EXPIRED,
            {"payment_hash": job.invoice.payment_hash if job.invoice else None},
            actor_type=ActorType.SYSTEM,
        )
        
        return job
    
    async def expire_stale_jobs(self) -> int:
        """Find and expire stale jobs"""
        now = datetime.now(timezone.utc)
        expired_count = 0
        
        # Expire jobs with expired invoices
        async for doc in self.jobs.find({
            "status": JobStatus.SUBMITTED.value,
            "invoice.expiry": {"$lt": now},
        }):
            try:
                await self.mark_expired(str(doc["_id"]))
                expired_count += 1
            except Exception as e:
                print(f"Failed to expire job {doc['_id']}: {e}")
        
        # Expire claimed jobs older than 24 hours without invoice
        from datetime import timedelta
        claim_expiry = now - timedelta(hours=24)
        async for doc in self.jobs.find({
            "status": JobStatus.CLAIMED.value,
            "created_at": {"$lt": claim_expiry},
        }):
            try:
                await self.mark_expired(str(doc["_id"]))
                expired_count += 1
            except Exception as e:
                print(f"Failed to expire stale job {doc['_id']}: {e}")
        
        return expired_count
    
    async def get_job_events(self, job_id: str) -> list[JobEvent]:
        """Get audit events for a job"""
        cursor = self.events.find({"job_id": job_id}).sort("timestamp", 1)
        return [JobEvent.from_mongo(doc) async for doc in cursor]
    
    async def _log_event(
        self,
        job_id: str,
        event_type: JobEventType,
        payload: dict,
        actor_id: str | None = None,
        actor_type: ActorType = ActorType.SYSTEM,
    ) -> None:
        """Log a job event"""
        # Get current version
        last_event = await self.events.find_one(
            {"job_id": job_id},
            sort=[("version", -1)],
        )
        version = (last_event["version"] + 1) if last_event else 1
        
        event = JobEvent(
            event_type=event_type,
            job_id=job_id,
            payload=payload,
            actor_id=actor_id,
            actor_type=actor_type,
            version=version,
        )
        
        await self.events.insert_one(event.to_mongo())

