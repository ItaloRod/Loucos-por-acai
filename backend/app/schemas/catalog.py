import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

# --- INVENTORY SCHEMAS ---
class InventoryBase(BaseModel):
    quantity: int = Field(default=0, ge=0)
    minimum_threshold: int = Field(default=5, ge=0)
    unit: str = Field(..., max_length=20)

class InventoryCreate(InventoryBase):
    product_id: uuid.UUID

class InventoryUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=0)
    minimum_threshold: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=20)
    last_restocked_at: datetime | None = None

class InventoryOut(InventoryBase):
    id: uuid.UUID
    product_id: uuid.UUID
    last_restocked_at: datetime | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- PRODUCT SCHEMAS ---
class ProductBase(BaseModel):
    name: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=220)
    description: str | None = None
    price: Decimal = Field(..., ge=0)
    category_id: uuid.UUID
    image_url: str | None = Field(default=None, max_length=255)
    is_available: bool = True
    is_topping: bool = False
    is_base: bool = False
    tags: list | dict | None = None
    display_order: int = 0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    category_id: uuid.UUID | None = None
    image_url: str | None = Field(default=None, max_length=255)
    is_available: bool | None = None
    is_topping: bool | None = None
    is_base: bool | None = None
    tags: list | dict | None = None
    display_order: int | None = None

class ProductOut(ProductBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    inventory: InventoryOut | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedProductOut(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    pages: int



# --- CATEGORY SCHEMAS ---
class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=120)
    description: str | None = None
    parent_id: uuid.UUID | None = None
    display_order: int = 0
    is_active: bool = True
    image_url: str | None = Field(default=None, max_length=255)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    slug: str | None = Field(default=None, max_length=120)
    description: str | None = None
    parent_id: uuid.UUID | None = None
    display_order: int | None = None
    is_active: bool | None = None
    image_url: str | None = Field(default=None, max_length=255)

class CategoryOut(CategoryBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
