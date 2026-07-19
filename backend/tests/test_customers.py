import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.loyalty import StampCard
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
    db.flush()  # Garante que user.id seja preenchido

    if role == UserRole.CLIENTE:
        stamp_card = StampCard(
            customer_id=user.id,
            current_stamps=3,
            total_stamps_earned=5,
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

def test_list_customers_permissions(client: TestClient, db: Session):
    """
    Testa permissões para listar clientes:
    - Sem login: 401
    - CLIENTE: 403
    - FUNCIONARIO: 200
    - GERENTE: 200
    """
    # 1. Sem login
    resp = client.get("/api/v1/customers/")
    assert resp.status_code == 401

    # 2. CLIENTE
    login_as_role(client, db, UserRole.CLIENTE, "cliente@example.com", "111.111.111-11")
    resp = client.get("/api/v1/customers/")
    assert resp.status_code == 403

    # Limpar cookies do client
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 3. FUNCIONARIO
    login_as_role(client, db, UserRole.FUNCIONARIO, "func@example.com", "222.222.222-22")
    resp = client.get("/api/v1/customers/")
    assert resp.status_code == 200

    # Limpar cookies
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 4. GERENTE
    login_as_role(client, db, UserRole.GERENTE, "gerente@example.com", "333.333.333-33")
    resp = client.get("/api/v1/customers/")
    assert resp.status_code == 200


def test_list_customers_search_and_pagination(client: TestClient, db: Session):
    """
    Testa os parâmetros de busca e paginação de clientes.
    """
    # Login como GERENTE
    login_as_role(client, db, UserRole.GERENTE, "gerente_list@example.com", "444.444.444-44")

    # Criar clientes para testar busca/paginação
    c1 = create_user_helper(db, "a_alice@example.com", "001.000.000-01", UserRole.CLIENTE)
    c1.first_name = "Alice"
    c1.last_name = "Moura"
    c1.phone = "85911111111"

    c2 = create_user_helper(db, "b_bob@example.com", "002.000.000-02", UserRole.CLIENTE)
    c2.first_name = "Bob"
    c2.last_name = "Silva"
    c2.phone = "85922222222"

    c3 = create_user_helper(db, "c_charlie@example.com", "003.000.000-03", UserRole.CLIENTE)
    c3.first_name = "Charlie"
    c3.last_name = "Brown"
    c3.phone = "85933333333"

    db.commit()

    # 1. Listar sem busca (deve retornar os 3 clientes criados para este teste)
    # Total de clientes criados: a_alice + b_bob + c_charlie = 3 clientes.
    resp = client.get("/api/v1/customers/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3

    # 2. Paginação: page=1, page_size=2
    resp = client.get("/api/v1/customers/?page=1&page_size=2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["total"] == 3
    assert data["pages"] == 2

    # 3. Busca por nome (Alice)
    resp = client.get("/api/v1/customers/?search=alice")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["first_name"] == "Alice"
    assert data["items"][0]["stamp_card"]["current_stamps"] == 3  # Verifica o stamp card carregado

    # 4. Busca por CPF
    resp = client.get("/api/v1/customers/?search=002.000.000-02")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["first_name"] == "Bob"

    # 5. Busca por telefone
    resp = client.get("/api/v1/customers/?search=9333333")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["first_name"] == "Charlie"


def test_get_customer_by_id(client: TestClient, db: Session):
    """
    Testa a recuperação de detalhes de cliente por ID.
    """
    # Criar cliente e funcionário
    customer = create_user_helper(db, "customer_detail@example.com", "555.555.555-55", UserRole.CLIENTE)
    
    # Login como funcionario
    login_as_role(client, db, UserRole.FUNCIONARIO, "funcionario_detail@example.com", "666.666.666-66")

    # 1. Buscar cliente existente
    resp = client.get(f"/api/v1/customers/{customer.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "customer_detail@example.com"
    assert data["stamp_card"] is not None
    assert data["stamp_card"]["current_stamps"] == 3

    # 2. Buscar ID que existe mas é funcionário (não é CLIENTE)
    # funcionario_detail id
    employee_id = db.query(User).filter(User.email == "funcionario_detail@example.com").first().id
    resp = client.get(f"/api/v1/customers/{employee_id}")
    assert resp.status_code == 404

    # 3. Buscar ID inexistente
    import uuid
    resp = client.get(f"/api/v1/customers/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_update_customer(client: TestClient, db: Session):
    """
    Testa a atualização de detalhes de cliente por ID.
    - FUNCIONARIO não pode (403)
    - GERENTE pode (200)
    - Duplicação de email ou CPF gera 400
    """
    customer = create_user_helper(db, "customer_up@example.com", "777.777.777-77", UserRole.CLIENTE)
    other_customer = create_user_helper(db, "other_up@example.com", "888.888.888-88", UserRole.CLIENTE)

    # 1. Tentar atualizar como FUNCIONARIO
    login_as_role(client, db, UserRole.FUNCIONARIO, "func_up@example.com", "999.999.999-99")
    resp = client.put(f"/api/v1/customers/{customer.id}", json={"first_name": "New Name"})
    assert resp.status_code == 403

    # Limpar cookies
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 2. Logar como GERENTE
    login_as_role(client, db, UserRole.GERENTE, "gerente_up@example.com", "121.212.121-21")
    
    # Atualizar com sucesso
    payload = {
        "first_name": "Updated",
        "last_name": "Customer",
        "phone": "85900000000",
        "email": "customer_new_email@example.com"
    }
    resp = client.put(f"/api/v1/customers/{customer.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["first_name"] == "Updated"
    assert data["email"] == "customer_new_email@example.com"

    # Tentar duplicar e-mail com o do other_customer
    resp = client.put(f"/api/v1/customers/{customer.id}", json={"email": "other_up@example.com"})
    assert resp.status_code == 400
    assert "e-mail" in resp.json()["detail"].lower()

    # Tentar duplicar CPF com o do other_customer
    resp = client.put(f"/api/v1/customers/{customer.id}", json={"cpf": "888.888.888-88"})
    assert resp.status_code == 400
    assert "cpf" in resp.json()["detail"].lower()
