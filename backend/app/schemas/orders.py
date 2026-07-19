import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.models.order import OrderStatus, OrderType
from app.schemas.catalog import ProductOut

class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(..., ge=1)
    options_selected: list[uuid.UUID] | None = None
    notes: str | None = None

class OrderCreate(BaseModel):
    order_type: OrderType
    items: list[OrderItemCreate]
    delivery_address_id: uuid.UUID | None = None
    payment_method: str = Field(..., max_length=50)
    apply_stamps_discount: bool = False
    customer_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validate_delivery_address(self):
        if self.order_type == OrderType.ONLINE_DELIVERY and not self.delivery_address_id:
            raise ValueError("delivery_address_id é obrigatório para pedidos de entrega (ONLINE_DELIVERY).")
        if self.order_type == OrderType.POS and not self.customer_id:
            raise ValueError("customer_id é obrigatório para pedidos no PDV (POS).")
        return self

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderCancelRequest(BaseModel):
    cancellation_reason: str | None = None

class OrderItemOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    product: ProductOut
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    notes: str | None = None
    parent_item_id: uuid.UUID | None = None
    sub_items: list["OrderItemOut"] = []

    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: uuid.UUID
    order_number: str
    customer_id: uuid.UUID
    employee_id: uuid.UUID | None
    status: OrderStatus
    order_type: OrderType
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    notes: str | None
    delivery_address_id: uuid.UUID | None
    estimated_ready_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    cancellation_reason: str | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]

    model_config = ConfigDict(from_attributes=True)
