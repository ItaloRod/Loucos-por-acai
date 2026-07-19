import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.product import Category, Product
from app.models.cart import Cart, CartItem
from app.core.security import get_password_hash

def setup_user_and_auth(client: TestClient, db: Session, email="cliente_cart@example.com", cpf="123.456.789-00"):
    hashed_pwd = get_password_hash("password123")
    user = User(
        email=email,
        hashed_password=hashed_pwd,
        cpf=cpf,
        role=UserRole.CLIENTE,
        is_active=True,
        first_name="Cart",
        last_name="Tester",
        phone="85999999999"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Login to set cookies
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert resp.status_code == 200
    return user

def create_catalog(db: Session):
    category = Category(name="Açaí", slug="acai", is_active=True)
    db.add(category)
    db.commit()
    db.refresh(category)

    base_product = Product(
        name="Açaí 500ml",
        slug="acai-500ml",
        price=18.50,
        category_id=category.id,
        is_available=True,
        is_base=True,
        is_topping=False
    )
    topping_banana = Product(
        name="Banana",
        slug="banana",
        price=2.00,
        category_id=category.id,
        is_available=True,
        is_base=False,
        is_topping=True
    )
    topping_leite_cond = Product(
        name="Leite Condensado",
        slug="leite-condensado",
        price=3.50,
        category_id=category.id,
        is_available=True,
        is_base=False,
        is_topping=True
    )
    non_topping = Product(
        name="Suco de Laranja",
        slug="suco-laranja",
        price=7.00,
        category_id=category.id,
        is_available=True,
        is_base=False,
        is_topping=False
    )
    db.add_all([base_product, topping_banana, topping_leite_cond, non_topping])
    db.commit()
    
    db.refresh(base_product)
    db.refresh(topping_banana)
    db.refresh(topping_leite_cond)
    db.refresh(non_topping)
    
    return base_product, topping_banana, topping_leite_cond, non_topping

def test_get_cart_creates_cart(client: TestClient, db: Session):
    user = setup_user_and_auth(client, db)
    
    # 1. Cart does not exist in DB yet
    assert db.query(Cart).filter(Cart.user_id == user.id).first() is None
    
    # 2. Get cart -> should create a new one
    resp = client.get("/api/v1/cart/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == str(user.id)
    assert len(data["items"]) == 0
    
    # 3. Check DB
    db_cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    assert db_cart is not None
    assert db_cart.expires_at > datetime.utcnow()

def test_add_item_to_cart(client: TestClient, db: Session):
    user = setup_user_and_auth(client, db)
    base_prod, topping_banana, topping_leite_cond, non_topping = create_catalog(db)
    
    # Add base product with toppings
    resp = client.post("/api/v1/cart/items", json={
        "product_id": str(base_prod.id),
        "quantity": 2,
        "options_selected": [str(topping_banana.id), str(topping_leite_cond.id)],
        "notes": "Sem colher"
    })
    assert resp.status_code == 201
    item_data = resp.json()
    assert item_data["product_id"] == str(base_prod.id)
    assert item_data["quantity"] == 2
    assert item_data["notes"] == "Sem colher"
    assert len(item_data["options_selected"]) == 2
    
    # Add same product with same toppings -> should increment quantity
    resp2 = client.post("/api/v1/cart/items", json={
        "product_id": str(base_prod.id),
        "quantity": 1,
        "options_selected": [str(topping_leite_cond.id), str(topping_banana.id)],  # order swapped
        "notes": "Mais leite condensado"
    })
    assert resp2.status_code == 201
    item_data_2 = resp2.json()
    assert item_data_2["id"] == item_data["id"]
    assert item_data_2["quantity"] == 3  # 2 + 1
    assert item_data_2["notes"] == "Mais leite condensado"

    # Add same product with DIFFERENT toppings -> should create new item
    resp3 = client.post("/api/v1/cart/items", json={
        "product_id": str(base_prod.id),
        "quantity": 1,
        "options_selected": [str(topping_banana.id)],
        "notes": "Apenas banana"
    })
    assert resp3.status_code == 201
    item_data_3 = resp3.json()
    assert item_data_3["id"] != item_data["id"]
    assert item_data_3["quantity"] == 1
    
    # Verify cart total items is 2
    resp_cart = client.get("/api/v1/cart/")
    assert len(resp_cart.json()["items"]) == 2

def test_add_item_to_cart_toppings_validation(client: TestClient, db: Session):
    user = setup_user_and_auth(client, db)
    base_prod, topping_banana, topping_leite_cond, non_topping = create_catalog(db)
    
    # Try to add item with non-topping product as options_selected
    resp = client.post("/api/v1/cart/items", json={
        "product_id": str(base_prod.id),
        "quantity": 1,
        "options_selected": [str(non_topping.id)]
    })
    assert resp.status_code == 400
    assert "Apenas adicionais" in resp.json()["detail"]
    
    # Try to add item with non-existent product in options_selected
    resp_fake = client.post("/api/v1/cart/items", json={
        "product_id": str(base_prod.id),
        "quantity": 1,
        "options_selected": [str(uuid.uuid4())]
    })
    assert resp_fake.status_code == 400
    assert "Um ou mais adicionais não existem" in resp_fake.json()["detail"]

def test_update_and_delete_cart_item(client: TestClient, db: Session):
    user = setup_user_and_auth(client, db)
    base_prod, _, _, _ = create_catalog(db)
    
    # Add item
    add_resp = client.post("/api/v1/cart/items", json={
        "product_id": str(base_prod.id),
        "quantity": 1
    })
    item_id = add_resp.json()["id"]
    
    # Update item
    put_resp = client.put(f"/api/v1/cart/items/{item_id}", json={
        "quantity": 5,
        "notes": "Nova nota"
    })
    assert put_resp.status_code == 200
    assert put_resp.json()["quantity"] == 5
    assert put_resp.json()["notes"] == "Nova nota"
    
    # Delete item
    del_resp = client.delete(f"/api/v1/cart/items/{item_id}")
    assert del_resp.status_code == 204
    
    # Verify item is gone
    get_resp = client.get("/api/v1/cart/")
    assert len(get_resp.json()["items"]) == 0

def test_clear_cart(client: TestClient, db: Session):
    user = setup_user_and_auth(client, db)
    base_prod, _, _, _ = create_catalog(db)
    
    client.post("/api/v1/cart/items", json={"product_id": str(base_prod.id), "quantity": 1})
    client.post("/api/v1/cart/items", json={"product_id": str(base_prod.id), "quantity": 2, "notes": "outro"})
    
    # Clear
    clear_resp = client.delete("/api/v1/cart/")
    assert clear_resp.status_code == 204
    
    # Verify empty
    get_resp = client.get("/api/v1/cart/")
    assert len(get_resp.json()["items"]) == 0

def test_cart_expiration(client: TestClient, db: Session):
    user = setup_user_and_auth(client, db)
    base_prod, _, _, _ = create_catalog(db)
    
    # 1. Create cart and add item
    client.post("/api/v1/cart/items", json={"product_id": str(base_prod.id), "quantity": 2})
    
    # Verify item exists
    get_resp = client.get("/api/v1/cart/")
    assert len(get_resp.json()["items"]) == 1
    
    # 2. Backdate expires_at in DB
    db_cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    db_cart.expires_at = datetime.utcnow() - timedelta(hours=2)
    db.commit()
    
    # 3. Get cart -> should be cleared and expires_at extended
    get_resp_expired = client.get("/api/v1/cart/")
    assert get_resp_expired.status_code == 200
    assert len(get_resp_expired.json()["items"]) == 0
    
    # Verify expires_at is updated to future
    db.refresh(db_cart)
    assert db_cart.expires_at > datetime.utcnow()
