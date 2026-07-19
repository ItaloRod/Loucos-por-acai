import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    old_values: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    new_values: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relacionamentos
    user: Mapped["User | None"] = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog action={self.action} entity={self.entity_type} entity_id={self.entity_id}>"
