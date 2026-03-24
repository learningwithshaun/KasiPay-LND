"""User service - authentication and user management"""
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import create_access_token, create_refresh_token, hash_pin, verify_pin
from app.models.user import User, UserCreate, UserRole, UserStatus


class UserService:
    """User management service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users
    
    async def register(self, data: UserCreate) -> dict:
        """Register a new user"""
        # Check if phone already exists
        existing = await self.collection.find_one({"phone": data.phone})
        if existing:
            raise ValueError("Phone number already registered")
        
        # Create user
        user = User(
            phone=data.phone,
            pin_hash=hash_pin(data.pin),
            display_name=data.display_name,
            role=UserRole.EARNER,
            status=UserStatus.ACTIVE,
        )
        
        await self.collection.insert_one(user.to_mongo())
        
        return self._generate_tokens(user)
    
    async def login(self, phone: str, pin: str) -> dict:
        """Authenticate user and return tokens"""
        user_doc = await self.collection.find_one({"phone": phone})
        if not user_doc:
            raise ValueError("Invalid phone or PIN")
        
        user = User.from_mongo(user_doc)
        
        if user.status != UserStatus.ACTIVE:
            raise ValueError("Account is not active")
        
        if not verify_pin(pin, user.pin_hash):
            raise ValueError("Invalid phone or PIN")
        
        return self._generate_tokens(user)
    
    async def refresh_token(self, user_id: str) -> dict:
        """Generate new access token"""
        user = await self.get_by_id(user_id)
        if not user or user.status != UserStatus.ACTIVE:
            raise ValueError("User not found or inactive")
        
        access_token = create_access_token({"sub": user.id, "role": user.role.value})
        return {"access_token": access_token}
    
    async def get_by_id(self, user_id: str) -> User | None:
        """Get user by ID"""
        doc = await self.collection.find_one({"_id": ObjectId(user_id)})
        return User.from_mongo(doc) if doc else None
    
    async def get_by_phone(self, phone: str) -> User | None:
        """Get user by phone"""
        doc = await self.collection.find_one({"phone": phone})
        return User.from_mongo(doc) if doc else None
    
    async def update_lightning_address(self, user_id: str, address: str) -> User:
        """Update user's Lightning address"""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"lightning_address": address}},
            return_document=True,
        )
        if not result:
            raise ValueError("User not found")
        return User.from_mongo(result)
    
    async def update_role(self, user_id: str, role: UserRole) -> User:
        """Update user role (admin only)"""
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"role": role.value}},
            return_document=True,
        )
        if not result:
            raise ValueError("User not found")
        return User.from_mongo(result)
    
    async def list_users(
        self,
        role: UserRole | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        """List users with pagination"""
        query = {}
        if role:
            query["role"] = role.value
        
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).skip(skip).limit(limit)
        users = [User.from_mongo(doc) async for doc in cursor]
        
        return users, total
    
    async def ensure_admin_exists(self, phone: str = "+27800000001", pin: str = "1234") -> None:
        """Ensure admin account exists (for development)"""
        existing = await self.collection.find_one({"role": UserRole.ADMIN.value})
        if not existing:
            admin = User(
                phone=phone,
                pin_hash=hash_pin(pin),
                display_name="Admin",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
            )
            await self.collection.insert_one(admin.to_mongo())
            print(f"✓ Created admin account: {phone}")
    
    def _generate_tokens(self, user: User) -> dict:
        """Generate JWT tokens for user"""
        token_data = {"sub": user.id, "role": user.role.value}
        
        return {
            "access_token": create_access_token(token_data),
            "refresh_token": create_refresh_token(token_data),
            "token_type": "bearer",
            "user": user.to_response(),
        }

