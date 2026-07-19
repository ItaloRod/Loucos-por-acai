import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, Integer, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relacionamentos
    user: Mapped["User"] = relationship("User", back_populates="cart")
    items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Cart user_id={self.user_id} expires_at={self.expires_at}>"


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    options_selected: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)  # List of UUIDs
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relacionamentos
    cart: Mapped[Cart] = relationship("Cart", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="cart_items")

    def __repr__(self) -> str:
        return f"<CartItem cart={self.cart_id} product={self.product_id} qty={self.quantity}>"
