"""Task routes"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_database
from app.models.task import TaskCreate, TaskStatus
from app.models.user import UserRole
from app.services.task_service import TaskService
from app.api.deps import get_current_active_user, require_role

router = APIRouter()


@router.get("")
async def list_tasks(
    current_user: Annotated[dict, Depends(get_current_active_user)],
    category: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List available tasks"""
    db = get_database()
    task_service = TaskService(db)
    
    tasks, total = await task_service.list_available(category, skip, limit)
    
    return {
        "success": True,
        "tasks": [t.to_response() for t in tasks],
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
        },
    }


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    current_user: Annotated[dict, Depends(get_current_active_user)],
):
    """Get task details"""
    db = get_database()
    task_service = TaskService(db)
    
    task = await task_service.get_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    return {"success": True, "task": task.to_response()}


@router.post("")
async def create_task(
    data: TaskCreate,
    current_user: Annotated[dict, Depends(require_role(UserRole.OPERATOR, UserRole.ADMIN))],
):
    """Create a new task (operator/admin only)"""
    db = get_database()
    task_service = TaskService(db)
    
    task = await task_service.create(data, current_user["user_id"])
    
    return {"success": True, "task": task.to_response()}


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: str,
    status: TaskStatus,
    current_user: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Update task status (admin only)"""
    db = get_database()
    task_service = TaskService(db)
    
    try:
        task = await task_service.update_status(task_id, status)
        return {"success": True, "task": task.to_response()}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

