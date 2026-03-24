"""Job routes - Lightning payment workflow"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.database import get_database
from app.models.job import JobCreate, InvoiceSubmit
from app.models.user import UserRole
from app.services.job_service import JobService
from app.services.approval_service import ApprovalService
from app.api.deps import get_current_active_user, require_role
from app.lnd import get_lnd_client

router = APIRouter()


class RejectRequest(BaseModel):
    reason: str


@router.post("")
async def create_job(
    data: JobCreate,
    current_user: Annotated[dict, Depends(get_current_active_user)],
):
    """Create a new job (claim a task)"""
    db = get_database()
    job_service = JobService(db)
    
    try:
        job = await job_service.create_job(data.task_id, current_user["user_id"])
        return {
            "success": True,
            "job": job.to_response(),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/my")
async def get_my_jobs(
    current_user: Annotated[dict, Depends(get_current_active_user)],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get current user's jobs"""
    db = get_database()
    job_service = JobService(db)
    
    jobs, total = await job_service.get_earner_jobs(current_user["user_id"], skip, limit)
    
    return {
        "success": True,
        "jobs": [j.to_response(include_invoice=True) for j in jobs],
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
        },
    }


@router.get("/operator/pending")
async def get_pending_jobs(
    current_user: Annotated[dict, Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Get jobs pending approval (operator only)"""
    db = get_database()
    job_service = JobService(db)
    
    jobs = await job_service.get_pending_jobs()
    
    return {
        "success": True,
        "jobs": [j.to_response() for j in jobs],
    }


@router.get("/operator/stats")
async def get_operator_stats(
    current_user: Annotated[dict, Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Get operator approval statistics"""
    db = get_database()
    approval_service = ApprovalService(db, get_lnd_client())
    
    stats = await approval_service.get_operator_stats(current_user["user_id"])
    
    return {"success": True, "stats": stats}


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    current_user: Annotated[dict, Depends(get_current_active_user)],
):
    """Get job details"""
    db = get_database()
    job_service = JobService(db)
    
    job = await job_service.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    # Check access
    is_owner = job.earner_id == current_user["user_id"]
    is_operator = current_user["role"] in [UserRole.OPERATOR, UserRole.ADMIN]
    
    if not is_owner and not is_operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this job",
        )
    
    return {"success": True, "job": job.to_response(include_invoice=is_owner)}


@router.post("/{job_id}/submit")
async def submit_invoice(
    job_id: str,
    data: InvoiceSubmit,
    current_user: Annotated[dict, Depends(get_current_active_user)],
):
    """Submit a Lightning invoice for a job"""
    db = get_database()
    job_service = JobService(db)
    
    try:
        job = await job_service.submit_invoice(job_id, data.bolt11, current_user["user_id"])
        return {
            "success": True,
            "job": job.to_response(include_invoice=True),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{job_id}/approve")
async def approve_job(
    job_id: str,
    current_user: Annotated[dict, Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Approve a job and trigger payment"""
    db = get_database()
    approval_service = ApprovalService(db, get_lnd_client())
    
    result = await approval_service.approve_job(job_id, current_user["user_id"])
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )
    
    return {
        "success": True,
        "job": result["job"],
        "payment": result.get("payment"),
    }


@router.post("/{job_id}/reject")
async def reject_job(
    job_id: str,
    data: RejectRequest,
    current_user: Annotated[dict, Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Reject a job"""
    db = get_database()
    approval_service = ApprovalService(db, get_lnd_client())
    
    result = await approval_service.reject_job(job_id, current_user["user_id"], data.reason)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )
    
    return {"success": True, "job": result["job"]}


@router.get("/{job_id}/events")
async def get_job_events(
    job_id: str,
    current_user: Annotated[dict, Depends(get_current_active_user)],
):
    """Get audit events for a job"""
    db = get_database()
    job_service = JobService(db)
    
    job = await job_service.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    # Check access
    is_owner = job.earner_id == current_user["user_id"]
    is_operator = current_user["role"] in [UserRole.OPERATOR, UserRole.ADMIN]
    
    if not is_owner and not is_operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this job",
        )
    
    events = await job_service.get_job_events(job_id)
    
    return {
        "success": True,
        "events": [e.to_response() for e in events],
    }

