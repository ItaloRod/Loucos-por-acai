import uuid
from datetime import datetime, time, date
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Time, Date, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class BusinessHours(Base):
    __tablename__ = "business_hours"
    __table_args__ = (
        CheckConstraint("day_of_week >= 0 AND day_of_week <= 6", name="check_business_hours_day_of_week_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 = Monday, 6 = Sunday
    opening_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    closing_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<BusinessHours day={self.day_of_week} closed={self.is_closed} open={self.opening_time} close={self.closing_time}>"


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Holiday {self.date}: {self.description} closed={self.is_closed}>"


class TemporaryClosure(Base):
    __tablename__ = "temporary_closures"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    # Relacionamentos
    created_by: Mapped["User"] = relationship("User", back_populates="temporary_closures")

    def __repr__(self) -> str:
        return f"<TemporaryClosure start={self.start_datetime} end={self.end_datetime} reason={self.reason[:30]}>"
