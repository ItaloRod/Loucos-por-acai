import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.product import Category, Product

def test_list_products_pagination_and_filters(client: TestClient, db: Session):
    # 1. Criar categoria
    category = Category(name="Açaí na Tigela", slug="acai-na-tigela", is_active=True)
    db.add(category)
    db.commit()
    db.refresh(category)

    # 2. Criar produtos com tags diferentes
    p1 = Product(
        name="Açaí Tradicional",
        slug="acai-tradicional",
        price=15.00,
        category_id=category.id,
        is_available=True,
        tags=["vegano", "morango"],
        display_order=1
    )
    p2 = Product(
        name="Açaí Especial",
        slug="acai-especial",
        price=22.50,
        category_id=category.id,
        is_available=True,
        tags=["vegano", "banana"],
        display_order=2
    )
    p3 = Product(
        name="Copo de Suco de Laranja",
        slug="suco-laranja",
        price=8.00,
        category_id=category.id,
        is_available=True,
        tags=["bebida"],
        display_order=3
    )
    db.add_all([p1, p2, p3])
    db.commit()

    # Testar listagem simples
    resp = client.get("/api/v1/catalog/products")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    assert data["page"] == 1
    assert data["pages"] == 1

    # Testar paginação
    resp = client.get("/api/v1/catalog/products?page=1&page_size=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["pages"] == 2

    # Testar busca textual (search)
    resp = client.get("/api/v1/catalog/products?search=suco")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Copo de Suco de Laranja"

    # Testar busca por tag
    resp = client.get("/api/v1/catalog/products?tags=vegano")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2

    resp = client.get("/api/v1/catalog/products?tags=banana")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Açaí Especial"

def test_upload_image_endpoint(client: TestClient, db: Session):
    # Registrar e fazer login como GERENTE
    register_payload = {
        "email": "gerente@example.com",
        "password": "managerpassword",
        "first_name": "Gerente",
        "last_name": "Louco",
        "cpf": "111.111.111-11",
        "phone": "85988888888",
        "role": "GERENTE"
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "gerente@example.com",
        "password": "managerpassword"
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200

    # Simular upload de arquivo
    file_data = b"fake image content"
    file = io.BytesIO(file_data)
    file.name = "test_image.png"

    response = client.post(
        "/api/v1/catalog/upload-image",
        files={"file": (file.name, file, "image/png")}
    )
    assert response.status_code == 200
    assert "image_url" in response.json()
    assert response.json()["image_url"].startswith("/static/uploads/")
