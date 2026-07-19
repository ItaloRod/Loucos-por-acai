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

class AddressBase(BaseModel):
    street: str
    number: str
    complement: str | None = None
    neighborhood: str
    city: str
    state: str = Field(..., max_length=2)
    zip_code: str = Field(..., pattern=r"^\d{5}-\d{3}$")
    is_default: bool

class AddressCreate(AddressBase):
    pass

class AddressUpdate(BaseModel):
    street: str | None = None
    number: str | None = None
    complement: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = Field(default=None, max_length=2)
    zip_code: str | None = Field(default=None, pattern=r"^\d{5}-\d{3}$")
    is_default: bool | None = None

class AddressOut(AddressBase):
    id: uuid.UUID
    user_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class UserOut(UserBase):
    id: uuid.UUID
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime
    addresses: list[AddressOut] | None = None

    model_config = ConfigDict(from_attributes=True)


class StampCardOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    current_stamps: int
    total_stamps_earned: int
    total_redemptions: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerOut(UserOut):
    stamp_card: StampCardOut | None = None


class PaginatedCustomerOut(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    pages: int


class PaginatedEmployeeOut(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    pages: int

