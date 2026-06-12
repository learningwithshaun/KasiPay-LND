"""Lightning Payday - FastAPI Application"""
import asyncio
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_database, close_database, get_database
from app.api import api_router
from app.lnd import init_lnd_client, get_lnd_client
from app.services.user_service import UserService
from app.services.job_service import JobService


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


# Background task for expiring stale jobs
async def expire_jobs_task():
    """Background task to expire stale jobs"""
    while True:
        try:
            await asyncio.sleep(60)  # Run every minute
            db = get_database()
            job_service = JobService(db)
            expired = await job_service.expire_stale_jobs()
            if expired > 0:
                print(f"Expired {expired} stale jobs")
        except Exception as e:
            print(f"Job expiry error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown"""
    # Startup
    print(f"\n{'='*50}")
    print(f"  ⚡ Lightning Payday API Server")
    print(f"{'='*50}")
    
    if settings.mock_mode:
        print("\n🎭 Running in MOCK MODE - No external dependencies required\n")
    
    # Initialize database
    await init_database()
    
    # Ensure demo accounts exist (development only)
    if settings.environment != "production":
        db = get_database()
        user_service = UserService(db)
        await user_service.ensure_admin_exists()
        await _seed_demo_data(db)
    
    # Initialize LND client (if configured)
    if not settings.mock_mode:
        await init_lnd_client()
    
    # Start background task
    task = asyncio.create_task(expire_jobs_task())
    
    print(f"\n✓ Server ready on {settings.host}:{settings.port}")
    print(f"  Environment: {settings.environment}")
    print(f"  Mock mode: {settings.mock_mode}")
    if settings.is_lnd_configured:
        print(f"  LND: {settings.lnd_grpc_host} ({settings.lnd_network})")
    print()
    
    yield
    
    # Shutdown
    task.cancel()
    
    lnd = get_lnd_client()
    if lnd:
        lnd.disconnect()
    
    await close_database()
    print("Server shutdown complete")


async def _seed_demo_data(db):
    """Seed demo data for development"""
    from app.core.security import hash_pin
    from app.models.user import User, UserRole, UserStatus
    from app.models.task import Task, TaskStatus
    
    users_col = db.users
    tasks_col = db.tasks
    
    # Demo accounts
    demo_accounts = [
        ("+27800000001", "Admin User", UserRole.ADMIN),
        ("+27800000002", "Operator User", UserRole.OPERATOR),
        ("+27800000003", "Earner User", UserRole.EARNER),
    ]
    
    for phone, name, role in demo_accounts:
        existing = await users_col.find_one({"phone": phone})
        if not existing:
            user = User(
                phone=phone,
                pin_hash=hash_pin("1234"),
                display_name=name,
                role=role,
                status=UserStatus.ACTIVE,
            )
            await users_col.insert_one(user.to_mongo())
    
    # Demo tasks
    demo_tasks = [
        ("Clean Community Garden", "Help clean and maintain the community garden", 2000, 40.0),
        ("Survey Completion", "Complete a 5-minute feedback survey", 500, 10.0),
        ("Recycling Collection", "Collect and sort recyclables in your area", 1500, 30.0),
    ]
    
    admin = await users_col.find_one({"role": UserRole.ADMIN.value})
    if admin:
        for title, desc, sats, zar in demo_tasks:
            existing = await tasks_col.find_one({"title": title})
            if not existing:
                task = Task(
                    title=title,
                    description=desc,
                    reward_sats=sats,
                    reward_zar=zar,
                    status=TaskStatus.ACTIVE,
                    max_claims=10,
                    created_by=str(admin["_id"]),
                )
                await tasks_col.insert_one(task.to_mongo())
    
    print("\n" + "="*55)
    print("  🎭 DEMO MODE - Pre-seeded Accounts")
    print("  " + "-"*51)
    print("  Demo Accounts (PIN: 1234)")
    print("  " + "-"*51)
    print("  👑 Admin:    +27800000001")
    print("  ✅ Operator: +27800000002")
    print("  💰 Earner:   +27800000003")
    print("="*55)


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Lightning-powered income system for township youth",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"] if settings.environment != "production" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "mode": "mock" if settings.mock_mode else "normal",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc) if settings.debug else "Internal server error",
        },
    )


# Include API router
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
    )

