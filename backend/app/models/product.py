import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Numeric, Integer, Text, JSON, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relacionamentos
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")
    
    # Auto-relacionamento para hierarquia
    parent: Mapped["Category | None"] = relationship(
        "Category", remote_side=[id], back_populates="subcategories"
    )
    subcategories: Mapped[list["Category"]] = relationship(
        "Category", back_populates="parent"
    )

    def __repr__(self) -> str:
        return f"<Category {self.name}>"


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="check_product_price_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_topping: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_base: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tags: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relacionamentos
    category: Mapped[Category] = relationship("Category", back_populates="products")
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")
    cart_items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product {self.name} (R${self.price})>"


class Inventory(Base):
    __tablename__ = "inventories"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_inventory_quantity_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    minimum_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    last_restocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relacionamentos
    product: Mapped[Product] = relationship("Product", back_populates="inventory")

    def __repr__(self) -> str:
        return f"<Inventory product_id={self.product_id} qty={self.quantity} {self.unit}>"
