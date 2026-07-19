import uuid
import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, Text, Enum as SQLEnum, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class OrderType(str, enum.Enum):
    ONLINE_PICKUP = "ONLINE_PICKUP"
    ONLINE_DELIVERY = "ONLINE_DELIVERY"
    POS = "POS"

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("total >= 0", name="check_order_total_non_negative"),
        CheckConstraint("subtotal >= 0", name="check_order_subtotal_non_negative"),
        CheckConstraint("discount >= 0", name="check_order_discount_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(SQLEnum(OrderStatus), nullable=False)
    order_type: Mapped[OrderType] = mapped_column(SQLEnum(OrderType), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cash_tendered: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    change_due: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_address_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    estimated_ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relacionamentos
    customer: Mapped["User"] = relationship("User", back_populates="orders_placed", foreign_keys=[customer_id])
    employee: Mapped["User | None"] = relationship("User", back_populates="orders_processed", foreign_keys=[employee_id])
    delivery_address: Mapped["Address | None"] = relationship("Address", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    stamp_transactions: Mapped[list["StampTransaction"]] = relationship("StampTransaction", back_populates="order")

    def __repr__(self) -> str:
        return f"<Order {self.order_number} status={self.status} total={self.total}>"


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_order_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="check_order_item_unit_price_non_negative"),
        CheckConstraint("subtotal >= 0", name="check_order_item_subtotal_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_item_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"), nullable=True)

    # Relacionamentos
    order: Mapped[Order] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")
    
    # Hierarquia para toppings
    parent_item: Mapped["OrderItem | None"] = relationship(
        "OrderItem", remote_side=[id], back_populates="sub_items"
    )
    sub_items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="parent_item", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<OrderItem order={self.order_id} product={self.product_id} qty={self.quantity}>"
