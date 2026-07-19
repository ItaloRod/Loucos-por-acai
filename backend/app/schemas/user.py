import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    cpf: str = Field(..., max_length=14, pattern=r"^\d{3}\.\d{3}\.\d{3}-\d{2}$")
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    cpf: str | None = Field(default=None, max_length=14, pattern=r"^\d{3}\.\d{3}\.\d{3}-\d{2}$")
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=100)

class UserOut(UserBase):
    id: uuid.UUID
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
