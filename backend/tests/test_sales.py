import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.loyalty import StampCard
from app.models.product import Category, Product, Inventory
from app.models.order import Order, OrderItem, OrderStatus, OrderType
from app.core.security import get_password_hash

def create_user_helper(db: Session, email: str, cpf: str, role: UserRole, is_active: bool = True):
    hashed_pwd = get_password_hash("password123")
    user = User(
        email=email,
        hashed_password=hashed_pwd,
        cpf=cpf,
        role=role,
        is_active=is_active,
        first_name="Test",
        last_name=role.value.capitalize(),
        phone="85999999999"
    )
    db.add(user)
    db.flush()

    if role == UserRole.CLIENTE:
        stamp_card = StampCard(
            customer_id=user.id,
            current_stamps=0,
            total_stamps_earned=0,
            total_redemptions=0
        )
        db.add(stamp_card)

    db.commit()
    db.refresh(user)
    return user

def login_as_role(client: TestClient, db: Session, role: UserRole, email: str, cpf: str):
    user = create_user_helper(db, email, cpf, role)
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login_resp.status_code == 200
    return user

def setup_catalog(db: Session):
    cat = Category(name="Açaí", slug="acai")
    db.add(cat)
    db.commit()
    db.refresh(cat)

    base = Product(name="Açaí 500ml", slug="acai-500", price=Decimal("15.00"), category_id=cat.id, is_base=True)
    db.add(base)
    db.commit()
    db.refresh(base)

    inv_base = Inventory(product_id=base.id, quantity=100, unit="unidade")
    db.add(inv_base)
    db.commit()
    return base

# --- Test Case 1: Search customer by CPF ---
def test_search_customer_by_cpf(client: TestClient, db: Session):
    # 1. Sem login (401)
    resp = client.get("/api/v1/customers/cpf/12345678901")
    assert resp.status_code == 401

    # 2. Logar como CLIENTE (403)
    login_as_role(client, db, UserRole.CLIENTE, "client_cpf@example.com", "123.456.789-01")
    resp = client.get("/api/v1/customers/cpf/12345678901")
    assert resp.status_code == 403

    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 3. Logar como FUNCIONARIO
    login_as_role(client, db, UserRole.FUNCIONARIO, "emp_cpf@example.com", "987.654.321-09")
    
    # Criar um cliente para buscar
    target_customer = create_user_helper(db, "target@example.com", "123.456.789-00", UserRole.CLIENTE)

    # Buscar por CPF formatado
    resp = client.get("/api/v1/customers/cpf/123.456.789-00")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "target@example.com"
    assert data["cpf"] == "123.456.789-00"
    assert "stamp_card" in data

    # Buscar por CPF apenas dígitos (normalizado)
    resp = client.get("/api/v1/customers/cpf/12345678900")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "target@example.com"

    # Buscar por CPF inexistente (404)
    resp = client.get("/api/v1/customers/cpf/00000000000")
    assert resp.status_code == 404

    # Buscar CPF de funcionário (deve retornar 404 já que o endpoint é apenas para CLIENTE)
    resp = client.get("/api/v1/customers/cpf/98765432109")
    assert resp.status_code == 404


# --- Test Case 2: POS order creation with cash_tendered and change_due validation ---
def test_pos_order_creation_cash_validation(client: TestClient, db: Session):
    product = setup_catalog(db)
    customer = create_user_helper(db, "pos_customer@example.com", "111.222.333-44", UserRole.CLIENTE)

    # Login como FUNCIONARIO
    login_as_role(client, db, UserRole.FUNCIONARIO, "pos_employee@example.com", "444.333.222-11")

    # 1. Criar pedido POS com pagamento em DINHEIRO (CASH) e valor suficiente (sucesso)
    payload = {
        "order_type": "POS",
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 2  # Total = 30.00
            }
        ],
        "payment_method": "CASH",
        "customer_id": str(customer.id),
        "cash_tendered": 50.00,
        "change_due": 20.00
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert Decimal(data["cash_tendered"]) == Decimal("50.00")
    assert Decimal(data["change_due"]) == Decimal("20.00")

    # 2. Criar pedido POS com pagamento CASH e valor sem troco especificado (deve calcular automaticamente)
    payload = {
        "order_type": "POS",
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 1  # Total = 15.00
            }
        ],
        "payment_method": "CASH",
        "customer_id": str(customer.id),
        "cash_tendered": 20.00
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert Decimal(data["cash_tendered"]) == Decimal("20.00")
    assert Decimal(data["change_due"]) == Decimal("5.00")

    # 3. Criar pedido POS com pagamento CASH mas sem cash_tendered (erro 400)
    payload = {
        "order_type": "POS",
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 1
            }
        ],
        "payment_method": "CASH",
        "customer_id": str(customer.id)
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "cash_tendered é obrigatório" in resp.json()["detail"]

    # 4. Criar pedido POS com pagamento CASH mas cash_tendered menor que o total (erro 400)
    payload = {
        "order_type": "POS",
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 2  # Total = 30.00
            }
        ],
        "payment_method": "CASH",
        "customer_id": str(customer.id),
        "cash_tendered": 25.00
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "insuficiente" in resp.json()["detail"]

    # 5. Criar pedido POS com pagamento CASH mas change_due passado incorreto (erro 400)
    payload = {
        "order_type": "POS",
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 2  # Total = 30.00
            }
        ],
        "payment_method": "CASH",
        "customer_id": str(customer.id),
        "cash_tendered": 50.00,
        "change_due": 10.00  # Troco correto = 20.00
    }
    resp = client.post("/api/v1/orders/", json=payload)
    assert resp.status_code == 400
    assert "Troco incorreto" in resp.json()["detail"]


# --- Test Case 3: Daily summary calculation of sales and aggregation metrics ---
def test_sales_daily_summary(client: TestClient, db: Session):
    product = setup_catalog(db)
    customer = create_user_helper(db, "summary_cust@example.com", "555.555.555-55", UserRole.CLIENTE)

    # 1. Sem login (401)
    resp = client.get("/api/v1/sales/daily-summary")
    assert resp.status_code == 401

    # 2. Login como CLIENTE (403)
    login_as_role(client, db, UserRole.CLIENTE, "summary_client@example.com", "666.666.666-66")
    resp = client.get("/api/v1/sales/daily-summary")
    assert resp.status_code == 403

    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 3. Login como GERENTE
    manager = login_as_role(client, db, UserRole.GERENTE, "summary_manager@example.com", "777.777.777-77")

    # Criar pedidos com diferentes tipos de pagamento e tipos de pedido
    # Pedido 1: POS, CASH, total = 15.00
    o1 = Order(
        order_number="PED-SUM-001",
        customer_id=customer.id,
        employee_id=manager.id,
        status=OrderStatus.COMPLETED,
        order_type=OrderType.POS,
        payment_method="CASH",
        cash_tendered=Decimal("20.00"),
        change_due=Decimal("5.00"),
        subtotal=Decimal("15.00"),
        discount=Decimal("0.00"),
        total=Decimal("15.00")
    )
    # Pedido 2: ONLINE_DELIVERY, PIX, total = 30.00
    o2 = Order(
        order_number="PED-SUM-002",
        customer_id=customer.id,
        status=OrderStatus.COMPLETED,
        order_type=OrderType.ONLINE_DELIVERY,
        payment_method="PIX",
        subtotal=Decimal("30.00"),
        discount=Decimal("0.00"),
        total=Decimal("30.00")
    )
    # Pedido 3: ONLINE_PICKUP, CREDIT_CARD, total = 15.00
    o3 = Order(
        order_number="PED-SUM-003",
        customer_id=customer.id,
        status=OrderStatus.COMPLETED,
        order_type=OrderType.ONLINE_PICKUP,
        payment_method="CREDIT_CARD",
        subtotal=Decimal("15.00"),
        discount=Decimal("0.00"),
        total=Decimal("15.00")
    )
    # Pedido 4: CANCELLED, PIX, total = 100.00 (não deve ser contabilizado)
    o4 = Order(
        order_number="PED-SUM-004",
        customer_id=customer.id,
        status=OrderStatus.CANCELLED,
        order_type=OrderType.ONLINE_DELIVERY,
        payment_method="PIX",
        subtotal=Decimal("100.00"),
        discount=Decimal("0.00"),
        total=Decimal("100.00")
    )

    db.add_all([o1, o2, o3, o4])
    db.commit()

    # Chamar resumo diário
    resp = client.get("/api/v1/sales/daily-summary")
    assert resp.status_code == 200
    data = resp.json()

    # Asserts gerais
    assert data["total_orders"] == 3
    assert Decimal(str(data["total_revenue"])) == Decimal("60.00")

    # Asserts por método de pagamento
    pay_methods = data["by_payment_method"]
    assert pay_methods["CASH"]["count"] == 1
    assert Decimal(str(pay_methods["CASH"]["revenue"])) == Decimal("15.00")
    assert pay_methods["PIX"]["count"] == 1
    assert Decimal(str(pay_methods["PIX"]["revenue"])) == Decimal("30.00")
    assert pay_methods["CREDIT_CARD"]["count"] == 1
    assert Decimal(str(pay_methods["CREDIT_CARD"]["revenue"])) == Decimal("15.00")
    assert "UNKNOWN" not in pay_methods

    # Asserts por tipo de pedido
    order_types = data["by_order_type"]
    assert order_types["POS"]["count"] == 1
    assert Decimal(str(order_types["POS"]["revenue"])) == Decimal("15.00")
    assert order_types["ONLINE_DELIVERY"]["count"] == 1
    assert Decimal(str(order_types["ONLINE_DELIVERY"]["revenue"])) == Decimal("30.00")
    assert order_types["ONLINE_PICKUP"]["count"] == 1
    assert Decimal(str(order_types["ONLINE_PICKUP"]["revenue"])) == Decimal("15.00")
