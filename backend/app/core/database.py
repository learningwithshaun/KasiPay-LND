"""MongoDB database connection using Motor async driver"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING

from .config import settings

# Global database client
_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def init_database() -> AsyncIOMotorDatabase:
    """Initialize MongoDB connection and create indexes"""
    global _client, _database
    
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _database = _client[settings.mongodb_database]
    
    # Create indexes
    await create_indexes(_database)
    
    print(f"✓ Connected to MongoDB: {settings.mongodb_database}")
    return _database


async def close_database() -> None:
    """Close MongoDB connection"""
    global _client, _database
    
    if _client:
        _client.close()
        _client = None
        _database = None
        print("✓ MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    if _database is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return _database


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create collection indexes for performance"""
    
    # Users collection
    await db.users.create_indexes([
        IndexModel([("phone", ASCENDING)], unique=True),
        IndexModel([("role", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
    ])
    
    # Tasks collection
    await db.tasks.create_indexes([
        IndexModel([("status", ASCENDING)]),
        IndexModel([("created_by", ASCENDING)]),
        IndexModel([("category", ASCENDING)]),
    ])
    
    # Jobs collection (Lightning)
    await db.jobs.create_indexes([
        IndexModel([("invoice.payment_hash", ASCENDING)], unique=True, sparse=True),
        IndexModel([("earner_id", ASCENDING), ("status", ASCENDING)]),
        IndexModel([("status", ASCENDING), ("submitted_at", ASCENDING)]),
        IndexModel([("task_id", ASCENDING)]),
    ])
    
    # Job Events collection (Audit Log)
    await db.job_events.create_indexes([
        IndexModel([("job_id", ASCENDING), ("timestamp", ASCENDING)]),
        IndexModel([("job_id", ASCENDING), ("version", ASCENDING)], unique=True),
        IndexModel([("event_type", ASCENDING), ("timestamp", DESCENDING)]),
    ])
    
    # Payouts collection
    await db.payouts.create_indexes([
        IndexModel([("earner_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("idempotency_key", ASCENDING)], unique=True, sparse=True),
    ])
    
    # Operators collection
    await db.operators.create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True),
        IndexModel([("status", ASCENDING)]),
    ])

