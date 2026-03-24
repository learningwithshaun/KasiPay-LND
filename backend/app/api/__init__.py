"""API routes"""
from fastapi import APIRouter

from .auth import router as auth_router
from .tasks import router as tasks_router
from .jobs import router as jobs_router
from .lnd import router as lnd_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
api_router.include_router(lnd_router, prefix="/lnd", tags=["lnd"])

__all__ = ["api_router"]

