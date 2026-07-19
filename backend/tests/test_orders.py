import pytest
import uuid
import random
from datetime import datetime, timezone, timedelta, time, date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, Address
from app.models.product import Category, Product, Inventory
from app.models.order import Order, OrderItem, OrderStatus, OrderType
from app.models.loyalty import StampCard, StampTransaction, StampTransactionType
from app.models.business_hours import BusinessHours, Holiday, TemporaryClosure
from app.core.security import get_password_hash

def setup_users(db: Session):
    # Customer
    customer = User(
        email="cliente@example.com",
        hashed_password=get_password_hash("pass"),
        cpf="111.111.111-11",
        role=UserRole.CLIENTE,
        is_active=True
    )
    # Employee
    employee = User(
        email="funcionario@example.com",
        hashed_password=get_password_hash("pass"),
        cpf="222.222.222-22",
        role=UserRole.FUNCIONARIO,
        is_active=True
    )
    db.add_all([customer, employee])
    db.commit()
    db.refresh(customer)
    db.refresh(employee)

    # Create stamp cards
    card_customer = StampCard(customer_id=customer.id, current_stamps=0, total_stamps_earned=0, total_redemptions=0)
    card_employee = StampCard(customer_id=employee.id, current_stamps=0, total_stamps_earned=0, total_redemptions=0)
    db.add_all([card_customer, card_employee])

    # Address
    address = Address(
        user_id=customer.id,
        street="Rua Central",
        number="123",
        neighborhood="Centro",
        city="Fortaleza",
        state="CE",
        zip_code="60000-000",
        is_default=True
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return customer, employee, address

def setup_catalog(db: Session):
    cat = Category(name="Açaí", slug="acai")
    db.add(cat)
    db.commit()
    db.refresh(cat)

    base = Product(name="Açaí 500ml", slug="acai-500", price=Decimal("15.00"), category_id=cat.id, is_base=True)
    topping = Product(name="M&Ms", slug="mms", price=Decimal("3.00"), category_id=cat.id, is_topping=True)
    
    db.add_all([base, topping])
    db.commit()
    db.refresh(base)
    db.refresh(topping)

    # Add inventory
    inv_base = Inventory(product_id=base.id, quantity=10, unit="unidade")
    inv_topping = Inventory(product_id=topping.id, quantity=20, unit="unidade")
    db.add_all([inv_base, inv_topping])
    db.commit()
    return base, topping

def authenticate_client(client: TestClient, email: str, password="pass"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200

def test_create_order_online_delivery_success(client: TestClient, db: Session):
    customer, employee, address = setup_users(db)
    base, topping = setup_catalog(db)
    
    authenticate_client(client, customer.email)

    payload = {
        "order_type": "ONLINE_DELIVERY",
        "items": [
            {
                "product_id": str(base.id),
                "quantity": 2,
                "options_selected": [str(topping.id)],
                "notes": "Capricha"
            }
        ],
        "delivery_address_id": str(address.id),
        "payment_method": "CREDIT_CARD",
        "apply_stamps_discount": False
    }

    # No BusinessHours yet, should be treated as open
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 201
    order_data = resp.json()
    assert order_data["order_type"] == "ONLINE_DELIVERY"
    assert order_data["status"] == "PENDING"
    assert Decimal(order_data["subtotal"]) == Decimal("36.00") # (15 + 3) * 2
    assert Decimal(order_data["total"]) == Decimal("36.00")
    
    # Check that stock was decremented:
    # base: 10 - 2 = 8
    # topping: 20 - 2 = 18
    inv_base = db.query(Inventory).filter(Inventory.product_id == base.id).first()
    inv_topping = db.query(Inventory).filter(Inventory.product_id == topping.id).first()
    assert inv_base.quantity == 8
    assert inv_topping.quantity == 18

def test_create_order_stock_validation(client: TestClient, db: Session):
    customer, employee, address = setup_users(db)
    base, topping = setup_catalog(db)
    
    authenticate_client(client, customer.email)

    payload = {
        "order_type": "ONLINE_DELIVERY",
        "items": [
            {
                "product_id": str(base.id),
                "quantity": 11,  # limit is 10
                "options_selected": []
            }
        ],
        "delivery_address_id": str(address.id),
        "payment_method": "MONEY"
    }

    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "Estoque insuficiente" in resp.json()["detail"]

def test_order_hours_validation(client: TestClient, db: Session):
    customer, employee, address = setup_users(db)
    base, topping = setup_catalog(db)
    authenticate_client(client, customer.email)

    # 1. Check Holiday Closed
    today = datetime.now().date()
    holiday = Holiday(date=today, description="Feriado Louco", is_closed=True)
    db.add(holiday)
    db.commit()

    payload = {
        "order_type": "ONLINE_PICKUP",
        "items": [{"product_id": str(base.id), "quantity": 1}],
        "payment_method": "PIX"
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "Feriado" in resp.json()["detail"]

    # Remove holiday
    db.delete(holiday)
    db.commit()

    # 2. Check Temporary Closure
    closure = TemporaryClosure(
        start_datetime=datetime.now(timezone.utc) - timedelta(hours=1),
        end_datetime=datetime.now(timezone.utc) + timedelta(hours=1),
        reason="Limpeza geral",
        created_by_id=employee.id
    )
    db.add(closure)
    db.commit()

    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "fechada temporariamente" in resp.json()["detail"]

    db.delete(closure)
    db.commit()

    # 3. Check Business Hours
    current_day = datetime.now().weekday()
    # Let's add business hours for today, but make it closed
    bh = BusinessHours(day_of_week=current_day, is_closed=True)
    db.add(bh)
    db.commit()

    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "fechada" in resp.json()["detail"]

    # Update to open but in past/future
    bh.is_closed = False
    bh.opening_time = time(hour=0, minute=0)
    bh.closing_time = time(hour=1, minute=0) # Closed now (unless it's exactly 12am-1am)
    db.commit()

    # If local time is not between 0:00 and 1:00, this should fail:
    local_hour = datetime.now().hour
    if local_hour != 0:
        resp = client.post("/api/v1/orders/", json=payload)
        assert resp.status_code == 400

def test_stamps_discount_and_redemption(client: TestClient, db: Session):
    customer, employee, address = setup_users(db)
    base, topping = setup_catalog(db)
    
    # Give customer 10 stamps
    stamp_card = db.query(StampCard).filter(StampCard.customer_id == customer.id).first()
    stamp_card.current_stamps = 10
    db.commit()

    authenticate_client(client, customer.email)

    payload = {
        "order_type": "ONLINE_PICKUP",
        "items": [{"product_id": str(base.id), "quantity": 2}], # 15 * 2 = 30.00
        "payment_method": "PIX",
        "apply_stamps_discount": True
    }

    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert Decimal(data["subtotal"]) == Decimal("30.00")
    assert Decimal(data["discount"]) == Decimal("20.00")
    assert Decimal(data["total"]) == Decimal("10.00")

    # Check stamps card
    db.refresh(stamp_card)
    assert stamp_card.current_stamps == 0
    assert stamp_card.total_redemptions == 1

    # Check transaction recorded
    tx = db.query(StampTransaction).filter(StampTransaction.order_id == uuid.UUID(data["id"])).first()
    assert tx is not None
    assert tx.type == StampTransactionType.REDEEMED
    assert tx.stamps_count == 10
    assert tx.discount_amount == Decimal("20.00")

def test_order_cancellation_and_restoration(client: TestClient, db: Session):
    customer, employee, address = setup_users(db)
    base, topping = setup_catalog(db)

    # Customer places order with stamps discount
    stamp_card = db.query(StampCard).filter(StampCard.customer_id == customer.id).first()
    stamp_card.current_stamps = 10
    db.commit()

    authenticate_client(client, customer.email)

    payload = {
        "order_type": "ONLINE_PICKUP",
        "items": [{"product_id": str(base.id), "quantity": 1}], # 15.00 subtotal
        "payment_method": "PIX",
        "apply_stamps_discount": True
    }
    resp = client.post("/api/v1/orders/", json=payload)
    order_id = resp.json()["id"]

    # Check stock decremented: 10 -> 9
    inv_base = db.query(Inventory).filter(Inventory.product_id == base.id).first()
    assert inv_base.quantity == 9

    # Cancel order
    cancel_resp = client.post(f"/api/v1/orders/{order_id}/cancel", json={"cancellation_reason": "Desisti"})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"
    assert cancel_resp.json()["cancellation_reason"] == "Desisti"

    # Verify stock restored: 9 -> 10
    db.refresh(inv_base)
    assert inv_base.quantity == 10

    # Verify stamps refunded: 0 -> 10
    db.refresh(stamp_card)
    assert stamp_card.current_stamps == 10

    # Verify reversal transaction exists
    rev_tx = db.query(StampTransaction).filter(
        StampTransaction.order_id == uuid.UUID(order_id),
        StampTransaction.type == StampTransactionType.REVERSED
    ).first()
    assert rev_tx is not None

def test_order_status_state_machine_and_earning_stamps(client: TestClient, db: Session):
    customer, employee, address = setup_users(db)
    base, topping = setup_catalog(db)

    # Employee login to change status
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]
    authenticate_client(client, employee.email)

    # 1. Employee places a POS order for customer
    payload = {
        "order_type": "POS",
        "customer_id": str(customer.id),
        "items": [{"product_id": str(base.id), "quantity": 3}], # 15 * 3 = 45.00
        "payment_method": "MONEY"
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 201
    order_data = resp.json()
    assert order_data["status"] == "PREPARING"
    order_id = order_data["id"]

    # 2. Try illegal transition PENDING -> READY (since status is PREPARING, it goes PREPARING -> READY)
    # Actually, from PREPARING to COMPLETED is invalid (must go READY first)
    put_resp = client.put(f"/api/v1/orders/{order_id}/status", json={"status": "COMPLETED"})
    assert put_resp.status_code == 400

    # 3. Transition PREPARING -> READY
    put_resp = client.put(f"/api/v1/orders/{order_id}/status", json={"status": "READY"})
    assert put_resp.status_code == 200
    assert put_resp.json()["status"] == "READY"

    # 4. Transition READY -> COMPLETED
    put_resp = client.put(f"/api/v1/orders/{order_id}/status", json={"status": "COMPLETED"})
    assert put_resp.status_code == 200
    assert put_resp.json()["status"] == "COMPLETED"
    assert put_resp.json()["completed_at"] is not None

    # Check that customer earned stamps: 45 // 20 = 2 stamps
    stamp_card = db.query(StampCard).filter(StampCard.customer_id == customer.id).first()
    assert stamp_card.current_stamps == 2
    assert stamp_card.total_stamps_earned == 2

    # Verify EARNED transaction recorded
    tx = db.query(StampTransaction).filter(
        StampTransaction.order_id == uuid.UUID(order_id),
        StampTransaction.type == StampTransactionType.EARNED
    ).first()
    assert tx is not None
    assert tx.stamps_count == 2

    # 5. Cancel the completed order -> should reverse earned stamps
    cancel_resp = client.post(f"/api/v1/orders/{order_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    db.refresh(stamp_card)
    assert stamp_card.current_stamps == 0
    assert stamp_card.total_stamps_earned == 0
