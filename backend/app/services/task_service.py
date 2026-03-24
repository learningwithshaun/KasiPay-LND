"""Task service - task management"""
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.task import Task, TaskCreate, TaskStatus


class TaskService:
    """Task management service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.tasks
    
    async def create(self, data: TaskCreate, created_by: str) -> Task:
        """Create a new task"""
        task = Task(
            title=data.title,
            description=data.description,
            instructions=data.instructions,
            reward_sats=data.reward_sats,
            reward_zar=data.reward_zar,
            category=data.category,
            tags=data.tags,
            max_claims=data.max_claims,
            status=TaskStatus.ACTIVE,
            created_by=created_by,
        )
        
        await self.collection.insert_one(task.to_mongo())
        return task
    
    async def get_by_id(self, task_id: str) -> Task | None:
        """Get task by ID"""
        doc = await self.collection.find_one({"_id": ObjectId(task_id)})
        return Task.from_mongo(doc) if doc else None
    
    async def list_available(
        self,
        category: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Task], int]:
        """List available tasks (active with available slots)"""
        query = {
            "status": TaskStatus.ACTIVE.value,
            "$expr": {"$lt": ["$current_claims", "$max_claims"]},
        }
        if category:
            query["category"] = category
        
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        tasks = [Task.from_mongo(doc) async for doc in cursor]
        
        return tasks, total
    
    async def list_all(
        self,
        status: TaskStatus | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Task], int]:
        """List all tasks (admin)"""
        query = {}
        if status:
            query["status"] = status.value
        
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        tasks = [Task.from_mongo(doc) async for doc in cursor]
        
        return tasks, total
    
    async def update_status(self, task_id: str, status: TaskStatus) -> Task:
        """Update task status"""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {"$set": {"status": status.value}},
            return_document=True,
        )
        if not result:
            raise ValueError("Task not found")
        return Task.from_mongo(result)
    
    async def increment_claims(self, task_id: str) -> None:
        """Increment current claims count"""
        await self.collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$inc": {"current_claims": 1}},
        )
    
    async def decrement_claims(self, task_id: str) -> None:
        """Decrement current claims count"""
        await self.collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$inc": {"current_claims": -1}},
        )

