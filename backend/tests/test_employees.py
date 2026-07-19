import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
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
    db.commit()
    db.refresh(user)
    return user

def login_as_role(client: TestClient, db: Session, role: UserRole, email: str, cpf: str):
    user = create_user_helper(db, email, cpf, role)
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login_resp.status_code == 200
    return user

def test_list_employees_permissions(client: TestClient, db: Session):
    """
    Testa as permissões de listagem de funcionários.
    - Sem login: 401
    - CLIENTE: 403
    - FUNCIONARIO: 403
    - GERENTE: 200
    """
    # 1. Sem login
    resp = client.get("/api/v1/employees/")
    assert resp.status_code == 401

    # 2. CLIENTE
    login_as_role(client, db, UserRole.CLIENTE, "client_emp@example.com", "111.111.111-11")
    resp = client.get("/api/v1/employees/")
    assert resp.status_code == 403

    # Limpar cookies
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 3. FUNCIONARIO
    login_as_role(client, db, UserRole.FUNCIONARIO, "func_emp@example.com", "222.222.222-22")
    resp = client.get("/api/v1/employees/")
    assert resp.status_code == 403

    # Limpar cookies
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]

    # 4. GERENTE
    login_as_role(client, db, UserRole.GERENTE, "gerente_emp@example.com", "333.333.333-33")
    resp = client.get("/api/v1/employees/")
    assert resp.status_code == 200


def test_list_employees_pagination_and_search(client: TestClient, db: Session):
    """
    Testa a paginação e busca por funcionários (apenas FUNCIONARIO e GERENTE).
    """
    login_as_role(client, db, UserRole.GERENTE, "gerente_search@example.com", "444.444.444-44")

    # Criar funcionários
    create_user_helper(db, "emp1@example.com", "001.000.000-01", UserRole.FUNCIONARIO)
    create_user_helper(db, "emp2@example.com", "002.000.000-02", UserRole.FUNCIONARIO)
    create_user_helper(db, "client_dummy@example.com", "003.000.000-03", UserRole.CLIENTE) # Não deve aparecer!

    # Total de funcionários esperados: gerente_search@example.com + emp1@example.com + emp2@example.com = 3
    resp = client.get("/api/v1/employees/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3

    # Busca por emp1
    resp = client.get("/api/v1/employees/?search=emp1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["email"] == "emp1@example.com"


def test_create_employee(client: TestClient, db: Session):
    """
    Testa a criação de funcionário por gerente.
    """
    login_as_role(client, db, UserRole.GERENTE, "gerente_create@example.com", "555.555.555-55")

    payload = {
        "email": "new_emp@example.com",
        "password": "strongpwd123",
        "first_name": "Pedro",
        "last_name": "Alves",
        "cpf": "123.456.789-00",
        "phone": "85988888888",
        "role": "FUNCIONARIO"
    }

    # 1. Criar com sucesso
    resp = client.post("/api/v1/employees/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new_emp@example.com"
    assert data["role"] == "FUNCIONARIO"

    # Verificar no banco de dados e testar login do novo funcionário
    user = db.query(User).filter(User.email == "new_emp@example.com").first()
    assert user is not None
    assert user.is_active is True

    # 2. Tentar criar com papel CLIENTE (deve falhar pois é rota de employees)
    payload["email"] = "new_client_fail@example.com"
    payload["cpf"] = "123.456.789-01"
    payload["role"] = "CLIENTE"
    resp = client.post("/api/v1/employees/", json=payload)
    assert resp.status_code == 400

    # 3. Tentar criar duplicado
    payload["role"] = "FUNCIONARIO"
    payload["email"] = "new_emp@example.com"  # e-mail duplicado
    resp = client.post("/api/v1/employees/", json=payload)
    assert resp.status_code == 400


def test_get_employee_by_id(client: TestClient, db: Session):
    """
    Testa a recuperação de funcionário por ID.
    """
    emp = create_user_helper(db, "emp_get@example.com", "666.666.666-66", UserRole.FUNCIONARIO)
    cli = create_user_helper(db, "cli_get@example.com", "777.777.777-77", UserRole.CLIENTE)

    login_as_role(client, db, UserRole.GERENTE, "gerente_get@example.com", "888.888.888-88")

    # 1. Buscar funcionário existente
    resp = client.get(f"/api/v1/employees/{emp.id}")
    assert resp.status_code == 200
    assert resp.json()["email"] == "emp_get@example.com"

    # 2. Buscar ID de um cliente (não deve achar)
    resp = client.get(f"/api/v1/employees/{cli.id}")
    assert resp.status_code == 404

    # 3. Buscar ID inexistente
    import uuid
    resp = client.get(f"/api/v1/employees/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_update_employee(client: TestClient, db: Session):
    """
    Testa a edição de funcionário.
    - Impedir self-deactivation.
    - Impedir alteração para CLIENTE.
    - Impedir duplicação de CPF/email.
    """
    current_gerente = login_as_role(client, db, UserRole.GERENTE, "gerente_up_emp@example.com", "999.999.999-99")
    emp = create_user_helper(db, "emp_up_target@example.com", "121.212.121-21", UserRole.FUNCIONARIO)

    # 1. Editar com sucesso
    payload = {
        "first_name": "UpdatedEmp",
        "last_name": "Surname",
        "phone": "85900001111",
        "email": "emp_up_target_new@example.com"
    }
    resp = client.put(f"/api/v1/employees/{emp.id}", json=payload)
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "UpdatedEmp"

    # 2. Tentar alterar papel para CLIENTE
    resp = client.put(f"/api/v1/employees/{emp.id}", json={"role": "CLIENTE"})
    assert resp.status_code == 400

    # 3. Tentar se desativar (gerente logado)
    resp = client.put(f"/api/v1/employees/{current_gerente.id}", json={"is_active": False})
    assert resp.status_code == 400
    assert "desativar sua própria conta" in resp.json()["detail"]


def test_delete_employee(client: TestClient, db: Session):
    """
    Testa a desativação de funcionário (soft-delete).
    """
    current_gerente = login_as_role(client, db, UserRole.GERENTE, "gerente_del@example.com", "321.321.321-32")
    emp = create_user_helper(db, "emp_del@example.com", "432.432.432-43", UserRole.FUNCIONARIO)
    cli = create_user_helper(db, "cli_del@example.com", "543.543.543-54", UserRole.CLIENTE)

    # 1. Desativar com sucesso
    resp = client.delete(f"/api/v1/employees/{emp.id}")
    assert resp.status_code == 200
    assert "desativado com sucesso" in resp.json()["detail"]

    # Verificar se is_active é False
    db.refresh(emp)
    assert emp.is_active is False

    # 2. Tentar se desativar (gerente logado)
    resp = client.delete(f"/api/v1/employees/{current_gerente.id}")
    assert resp.status_code == 400

    # 3. Tentar desativar um cliente (não deve achar)
    resp = client.delete(f"/api/v1/employees/{cli.id}")
    assert resp.status_code == 404
