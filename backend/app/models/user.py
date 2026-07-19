import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class UserRole(str, enum.Enum):
    CLIENTE = "CLIENTE"
    FUNCIONARIO = "FUNCIONARIO"
    GERENTE = "GERENTE"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cpf: Mapped[str] = mapped_column(String(14), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relacionamentos
    addresses: Mapped[list["Address"]] = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    stamp_card: Mapped["StampCard"] = relationship("StampCard", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    cart: Mapped["Cart"] = relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Especificar foreign_keys para desambiguar a relação bidirecional com Order
    orders_placed: Mapped[list["Order"]] = relationship(
        "Order", back_populates="customer", foreign_keys="[Order.customer_id]"
    )
    orders_processed: Mapped[list["Order"]] = relationship(
        "Order", back_populates="employee", foreign_keys="[Order.employee_id]"
    )
    
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
    temporary_closures: Mapped[list["TemporaryClosure"]] = relationship("TemporaryClosure", back_populates="created_by")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    street: Mapped[str] = mapped_column(String(200), nullable=False)
    number: Mapped[str] = mapped_column(String(20), nullable=False)
    complement: Mapped[str | None] = mapped_column(String(100), nullable=True)
    neighborhood: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(9), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relacionamentos
    user: Mapped[User] = relationship("User", back_populates="addresses")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="delivery_address")

    def __repr__(self) -> str:
        return f"<Address {self.street}, {self.number} - {self.neighborhood}>"
