from datetime import datetime, time, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import RequireRole
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus, OrderType
from pydantic import BaseModel

router = APIRouter(prefix="/sales", tags=["Sales"])

class SalesGroupSummary(BaseModel):
    count: int
    revenue: Decimal

class DailySummaryOut(BaseModel):
    total_orders: int
    total_revenue: Decimal
    by_payment_method: dict[str, SalesGroupSummary]
    by_order_type: dict[str, SalesGroupSummary]

@router.get("/daily-summary", response_model=DailySummaryOut)
def get_daily_summary(
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.FUNCIONARIO, UserRole.GERENTE))
):
    """
    Retorna o resumo diário de vendas (desde o início do dia atual no fuso horário local).
    Acesso restrito a FUNCIONARIO e GERENTE.
    """
    # Start of current day in local timezone
    local_now = datetime.now()
    local_start = datetime.combine(local_now.date(), time.min)
    
    # Represent start of day in UTC (timezone-aware and naive versions)
    # since sqlite store is UTC and potentially naive/aware depending on insertion method
    start_of_day_utc = local_start.astimezone().astimezone(timezone.utc)
    start_of_day_naive = start_of_day_utc.replace(tzinfo=None)

    # Count/Sum of all orders created today that are NOT in CANCELLED status.
    orders = db.query(Order).filter(
        (Order.created_at >= start_of_day_utc) | (Order.created_at >= start_of_day_naive),
        Order.status != OrderStatus.CANCELLED
    ).all()

    total_orders = len(orders)
    total_revenue = sum(order.total for order in orders)

    by_payment_method = {}
    by_order_type = {}

    for order in orders:
        # Group by payment method
        pay_method = order.payment_method or "UNKNOWN"
        pay_method = pay_method.upper()
        if pay_method not in by_payment_method:
            by_payment_method[pay_method] = {"count": 0, "revenue": Decimal("0.00")}
        by_payment_method[pay_method]["count"] += 1
        by_payment_method[pay_method]["revenue"] += order.total

        # Group by order type
        o_type = order.order_type.value
        if o_type not in by_order_type:
            by_order_type[o_type] = {"count": 0, "revenue": Decimal("0.00")}
        by_order_type[o_type]["count"] += 1
        by_order_type[o_type]["revenue"] += order.total

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "by_payment_method": by_payment_method,
        "by_order_type": by_order_type
    }
