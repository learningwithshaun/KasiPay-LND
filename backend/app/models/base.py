"""Base model with MongoDB ObjectId support"""
from datetime import datetime, timezone
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PyObjectId(str):
    """Custom type for MongoDB ObjectId"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            raise ValueError(f"Invalid ObjectId: {v}")
        raise TypeError(f"Expected ObjectId or str, got {type(v)}")
    
    @classmethod
    def __get_pydantic_json_schema__(cls, _schema_generator, _field_schema):
        return {"type": "string", "format": "objectid"}


# Type alias for ObjectId fields
ObjectIdStr = Annotated[str, Field(default_factory=lambda: str(ObjectId()))]


class MongoBaseModel(BaseModel):
    """Base model for MongoDB documents"""
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()},
    )
    
    id: ObjectIdStr = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        return v
    
    def to_mongo(self) -> dict[str, Any]:
        """Convert to MongoDB document format"""
        data = self.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data and isinstance(data["_id"], str):
            data["_id"] = ObjectId(data["_id"])
        return data
    
    @classmethod
    def from_mongo(cls, data: dict[str, Any]) -> "MongoBaseModel":
        """Create instance from MongoDB document"""
        if data is None:
            raise ValueError("Cannot create model from None")
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)

