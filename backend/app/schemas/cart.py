import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.catalog import ProductOut

class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(..., ge=1)
    options_selected: list[uuid.UUID] | None = None
    notes: str | None = None

class CartItemUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=1)
    notes: str | None = None

class CartItemOut(BaseModel):
    id: uuid.UUID
    cart_id: uuid.UUID
    product_id: uuid.UUID
    product: ProductOut
    quantity: int
    unit_price: Decimal
    options_selected: list[uuid.UUID] | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)

class CartOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    items: list[CartItemOut]

    model_config = ConfigDict(from_attributes=True)
