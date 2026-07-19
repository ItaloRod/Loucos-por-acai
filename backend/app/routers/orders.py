import uuid
import random
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user, RequireRole
from app.models.user import User, UserRole, Address
from app.models.order import Order, OrderItem, OrderStatus, OrderType
from app.models.loyalty import StampCard, StampTransaction, StampTransactionType
from app.models.product import Product, Inventory
from app.models.business_hours import BusinessHours, Holiday, TemporaryClosure
from app.schemas.orders import OrderOut, OrderCreate, OrderStatusUpdate, OrderCancelRequest

router = APIRouter(prefix="/orders", tags=["Orders"])

def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "employee_id": order.employee_id,
        "status": order.status,
        "order_type": order.order_type,
        "payment_method": order.payment_method,
        "cash_tendered": order.cash_tendered,
        "change_due": order.change_due,
        "subtotal": order.subtotal,
        "discount": order.discount,
        "total": order.total,
        "notes": order.notes,
        "delivery_address_id": order.delivery_address_id,
        "estimated_ready_at": order.estimated_ready_at,
        "completed_at": order.completed_at,
        "cancelled_at": order.cancelled_at,
        "cancellation_reason": order.cancellation_reason,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": [item for item in order.items if item.parent_item_id is None]
    }

def check_store_open(db: Session):
    local_now = datetime.now()
    current_date = local_now.date()
    current_time = local_now.time()
    current_day = local_now.weekday()

    # 1. Check Holiday
    holiday = db.query(Holiday).filter(Holiday.date == current_date, Holiday.is_closed == True).first()
    if holiday:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loja está fechada (Feriado)."
        )

    # 2. Check Temporary Closure
    utc_now = datetime.now(timezone.utc)
    closures = db.query(TemporaryClosure).all()
    for tc in closures:
        start = tc.start_datetime
        end = tc.end_datetime
        if start.tzinfo is not None:
            cmp_time = utc_now
        else:
            cmp_time = datetime.utcnow()
        if start <= cmp_time <= end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loja está fechada temporariamente: {tc.reason}"
            )

    # 3. Check Business Hours
    bh_count = db.query(BusinessHours).count()
    if bh_count > 0:
        bh = db.query(BusinessHours).filter(BusinessHours.day_of_week == current_day).first()
        if not bh or bh.is_closed or not bh.opening_time or not bh.closing_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loja está fechada."
            )
        if not (bh.opening_time <= current_time <= bh.closing_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loja está fechada fora do horário de funcionamento."
            )

def cancel_order_logic(order: Order, db: Session, cancellation_reason: str | None = None) -> Order:
    if order.status == OrderStatus.CANCELLED:
        return order

    # Restore inventory
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    restores = {}
    for item in order_items:
        restores[item.product_id] = restores.get(item.product_id, 0) + item.quantity

    for prod_id, qty in restores.items():
        inventory = db.query(Inventory).filter(Inventory.product_id == prod_id).with_for_update().first()
        if inventory:
            inventory.quantity += qty

    # Reverse earned stamps
    if order.status in [OrderStatus.COMPLETED, OrderStatus.DELIVERED]:
        earned_tx = db.query(StampTransaction).filter(
            StampTransaction.order_id == order.id,
            StampTransaction.type == StampTransactionType.EARNED
        ).first()
        if earned_tx:
            stamp_card = db.query(StampCard).filter(StampCard.id == earned_tx.stamp_card_id).first()
            if stamp_card:
                stamp_card.current_stamps = max(stamp_card.current_stamps - earned_tx.stamps_count, 0)
                stamp_card.total_stamps_earned = max(stamp_card.total_stamps_earned - earned_tx.stamps_count, 0)

                rev_tx = StampTransaction(
                    stamp_card_id=stamp_card.id,
                    type=StampTransactionType.REVERSED,
                    stamps_count=earned_tx.stamps_count,
                    order_id=order.id,
                    reversed_transaction_id=earned_tx.id
                )
                db.add(rev_tx)

    # Reverse redeemed stamps discount
    redeemed_tx = db.query(StampTransaction).filter(
        StampTransaction.order_id == order.id,
        StampTransaction.type == StampTransactionType.REDEEMED
    ).first()
    if redeemed_tx:
        stamp_card = db.query(StampCard).filter(StampCard.id == redeemed_tx.stamp_card_id).first()
        if stamp_card:
            stamp_card.current_stamps += redeemed_tx.stamps_count

            rev_tx = StampTransaction(
                stamp_card_id=stamp_card.id,
                type=StampTransactionType.REVERSED,
                stamps_count=redeemed_tx.stamps_count,
                order_id=order.id,
                reversed_transaction_id=redeemed_tx.id,
                discount_amount=redeemed_tx.discount_amount
            )
            db.add(rev_tx)

    order.status = OrderStatus.CANCELLED
    order.cancelled_at = datetime.now(timezone.utc)
    if cancellation_reason:
        order.cancellation_reason = cancellation_reason

    db.commit()
    db.refresh(order)
    return order

@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Enforce CLIENTE restrictions
    if current_user.role == UserRole.CLIENTE:
        customer_id = current_user.id
    else:
        if not payload.customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="customer_id é obrigatório para pedidos realizados por funcionários/gerentes."
            )
        customer_id = payload.customer_id

    # Validate customer exists
    customer = db.query(User).filter(User.id == customer_id, User.is_active == True).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado."
        )

    # 2. Check store status for online orders
    if payload.order_type in [OrderType.ONLINE_PICKUP, OrderType.ONLINE_DELIVERY]:
        check_store_open(db)

    # 3. Validate delivery address if applicable
    if payload.order_type == OrderType.ONLINE_DELIVERY:
        address = db.query(Address).filter(
            Address.id == payload.delivery_address_id,
            Address.user_id == customer_id
        ).first()
        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Endereço de entrega inválido ou não pertence ao cliente."
            )

    # 4. Lock inventories and validate quantities
    required_quantities = {}
    for item in payload.items:
        required_quantities[item.product_id] = required_quantities.get(item.product_id, 0) + item.quantity
        for topping_id in (item.options_selected or []):
            required_quantities[topping_id] = required_quantities.get(topping_id, 0) + item.quantity

    # Fetch products and lock inventories
    products_db = {}
    for prod_id, req_qty in required_quantities.items():
        # Fetch product
        prod = db.query(Product).filter(Product.id == prod_id, Product.deleted_at == None).first()
        if not prod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {prod_id} não encontrado."
            )
        products_db[prod_id] = prod

        # Validate that options are toppings and base is base
        # But wait, in required_quantities we don't distinguish parent/child easily. Let's do it below in step 5.

        # Lock inventory
        inventory = db.query(Inventory).filter(Inventory.product_id == prod_id).with_for_update().first()
        if not inventory or inventory.quantity < req_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estoque insuficiente para o produto {prod.name}."
            )
        inventory.quantity -= req_qty

    # 5. Build items details and calculate subtotal
    subtotal = Decimal("0.00")
    order_items_to_create = []

    for item in payload.items:
        base_product = products_db[item.product_id]
        
        # Check toppings validation
        toppings = []
        for topping_id in (item.options_selected or []):
            topping_prod = products_db[topping_id]
            if not topping_prod.is_topping:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Produto {topping_prod.name} não é um adicional (is_topping=False)."
                )
            toppings.append(topping_prod)

        # Parent item price & subtotal
        parent_unit_price = base_product.price
        parent_subtotal = parent_unit_price * item.quantity

        # Item's overall contribution to order subtotal
        overall_item_price = parent_unit_price + sum(t.price for t in toppings)
        overall_item_subtotal = overall_item_price * item.quantity
        subtotal += overall_item_subtotal

        order_items_to_create.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": parent_unit_price,
            "subtotal": parent_subtotal,
            "notes": item.notes,
            "toppings": toppings
        })

    # 6. Apply Stamp Discount
    discount = Decimal("0.00")
    stamp_card = None
    if payload.apply_stamps_discount:
        stamp_card = db.query(StampCard).filter(StampCard.customer_id == customer_id).first()
        if not stamp_card or stamp_card.current_stamps < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Saldo de selos insuficiente para resgate de desconto."
            )
        stamp_card.current_stamps -= 10
        stamp_card.total_redemptions += 1
        discount = Decimal("20.00")

    total = max(subtotal - discount, Decimal("0.00"))

    # Validate cash tender and change due if CASH
    cash_tendered = payload.cash_tendered
    change_due = payload.change_due

    if payload.payment_method.upper() == "CASH":
        if cash_tendered is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="cash_tendered é obrigatório para pagamentos em dinheiro."
            )
        if cash_tendered < total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valor pago (cash_tendered) é insuficiente."
            )
        calculated_change = cash_tendered - total
        if change_due is not None:
            if abs(change_due - calculated_change) > Decimal("0.01"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Troco incorreto. Calculado: {calculated_change}, Recebido: {change_due}"
                )
        else:
            change_due = calculated_change
    else:
        cash_tendered = None
        change_due = None

    # 7. Create Order
    order_number = f"PED-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    initial_status = OrderStatus.PREPARING if payload.order_type == OrderType.POS else OrderStatus.PENDING

    order = Order(
        order_number=order_number,
        customer_id=customer_id,
        employee_id=current_user.id if current_user.role in [UserRole.FUNCIONARIO, UserRole.GERENTE] else None,
        status=initial_status,
        order_type=payload.order_type,
        payment_method=payload.payment_method,
        cash_tendered=cash_tendered,
        change_due=change_due,
        subtotal=subtotal,
        discount=discount,
        total=total,
        delivery_address_id=payload.delivery_address_id,
        notes=None
    )
    db.add(order)
    db.flush()

    # Create OrderItems
    for oit in order_items_to_create:
        parent_item = OrderItem(
            order_id=order.id,
            product_id=oit["product_id"],
            quantity=oit["quantity"],
            unit_price=oit["unit_price"],
            subtotal=oit["subtotal"],
            notes=oit["notes"],
            parent_item_id=None
        )
        db.add(parent_item)
        db.flush()

        for t in oit["toppings"]:
            child_item = OrderItem(
                order_id=order.id,
                product_id=t.id,
                quantity=oit["quantity"],
                unit_price=t.price,
                subtotal=t.price * oit["quantity"],
                parent_item_id=parent_item.id
            )
            db.add(child_item)

    # Insert stamp transaction if discount was applied
    if payload.apply_stamps_discount and stamp_card:
        tx = StampTransaction(
            stamp_card_id=stamp_card.id,
            type=StampTransactionType.REDEEMED,
            stamps_count=10,
            order_id=order.id,
            discount_amount=Decimal("20.00")
        )
        db.add(tx)

    db.commit()
    db.refresh(order)
    return serialize_order(order)

@router.get("/", response_model=list[OrderOut])
def list_orders(
    status: OrderStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order)
    if current_user.role == UserRole.CLIENTE:
        query = query.filter(Order.customer_id == current_user.id)
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.created_at.desc()).all()
    return [serialize_order(o) for o in orders]

@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )
    if current_user.role == UserRole.CLIENTE and order.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para acessar este pedido."
        )
    return serialize_order(order)

@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(UserRole.FUNCIONARIO, UserRole.GERENTE))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )

    new_status = payload.status
    if new_status == order.status:
        return serialize_order(order)

    VALID_TRANSITIONS = {
        OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        OrderStatus.READY: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        OrderStatus.DELIVERED: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        OrderStatus.COMPLETED: [OrderStatus.CANCELLED],
        OrderStatus.CANCELLED: []
    }

    if new_status not in VALID_TRANSITIONS.get(order.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transição de status inválida de {order.status} para {new_status}."
        )

    if new_status == OrderStatus.CANCELLED:
        cancelled_order = cancel_order_logic(order, db, "Cancelado via atualização de status.")
        return serialize_order(cancelled_order)

    # Earn stamps logic when transitioning to COMPLETED or DELIVERED for the first time
    if new_status in [OrderStatus.COMPLETED, OrderStatus.DELIVERED]:
        existing_earned = db.query(StampTransaction).filter(
            StampTransaction.order_id == order.id,
            StampTransaction.type == StampTransactionType.EARNED
        ).first()

        if not existing_earned:
            stamp_card = db.query(StampCard).filter(StampCard.customer_id == order.customer_id).first()
            if not stamp_card:
                stamp_card = StampCard(
                    customer_id=order.customer_id,
                    current_stamps=0,
                    total_stamps_earned=0,
                    total_redemptions=0
                )
                db.add(stamp_card)
                db.flush()

            stamps_earned = int(order.total // Decimal("20.00"))
            if stamps_earned > 0:
                stamp_card.current_stamps += stamps_earned
                stamp_card.total_stamps_earned += stamps_earned

                tx = StampTransaction(
                    stamp_card_id=stamp_card.id,
                    type=StampTransactionType.EARNED,
                    stamps_count=stamps_earned,
                    order_id=order.id
                )
                db.add(tx)

    if new_status == OrderStatus.COMPLETED:
        order.completed_at = datetime.now(timezone.utc)

    order.status = new_status
    db.commit()
    db.refresh(order)
    return serialize_order(order)

@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: uuid.UUID,
    payload: OrderCancelRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado."
        )

    if current_user.role == UserRole.CLIENTE:
        if order.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para cancelar este pedido."
            )
        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clientes só podem cancelar pedidos com status PENDING."
            )

    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pedido já cancelado."
        )

    cancellation_reason = payload.cancellation_reason if payload else None
    cancelled_order = cancel_order_logic(order, db, cancellation_reason)
    return serialize_order(cancelled_order)
