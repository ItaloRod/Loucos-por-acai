import uuid
import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, Enum as SQLEnum, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class StampTransactionType(str, enum.Enum):
    EARNED = "EARNED"
    REDEEMED = "REDEEMED"
    REVERSED = "REVERSED"

class StampCard(Base):
    __tablename__ = "stamp_cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_stamps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_stamps_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_redemptions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relacionamentos
    customer: Mapped["User"] = relationship("User", back_populates="stamp_card")
    transactions: Mapped[list["StampTransaction"]] = relationship(
        "StampTransaction", back_populates="stamp_card", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<StampCard owner={self.customer_id} stamps={self.current_stamps}>"


class StampTransaction(Base):
    __tablename__ = "stamp_transactions"
    __table_args__ = (
        CheckConstraint("stamps_count > 0", name="check_transaction_stamps_count_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    stamp_card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stamp_cards.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[StampTransactionType] = mapped_column(SQLEnum(StampTransactionType), nullable=False)
    stamps_count: Mapped[int] = mapped_column(Integer, nullable=False)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    reversed_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stamp_transactions.id", ondelete="SET NULL"), nullable=True
    )
    discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relacionamentos
    stamp_card: Mapped[StampCard] = relationship("StampCard", back_populates="transactions")
    order: Mapped["Order | None"] = relationship("Order", back_populates="stamp_transactions")
    reversed_transaction: Mapped["StampTransaction | None"] = relationship(
        "StampTransaction", remote_side=[id]
    )

    def __repr__(self) -> str:
        return f"<StampTransaction id={self.id} type={self.type} count={self.stamps_count}>"
