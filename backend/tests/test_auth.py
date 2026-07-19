import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole

def test_register_client_success(client: TestClient, db: Session):
    """
    Testa o registro bem sucedido de um cliente e a criação automática do seu cartão fidelidade.
    """
    payload = {
        "email": "new_client@example.com",
        "password": "strongpassword123",
        "first_name": "Paulo",
        "last_name": "Silva",
        "cpf": "123.456.789-10",
        "phone": "85999999999",
        "role": "CLIENTE"
    }
    
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == "new_client@example.com"
    assert "id" in data
    
    # Verificar se o usuário existe no banco de dados e se tem StampCard
    user = db.query(User).filter(User.email == "new_client@example.com").first()
    assert user is not None
    assert user.role == UserRole.CLIENTE
    assert user.stamp_card is not None
    assert user.stamp_card.current_stamps == 0


def test_register_duplicate_email_or_cpf(client: TestClient, db: Session):
    """
    Testa o bloqueio de cadastro com e-mail ou CPF duplicados.
    """
    # Criar um usuário inicial no banco
    user = User(
        email="dup@example.com",
        hashed_password="pwd",
        cpf="111.222.333-44",
        role=UserRole.CLIENTE
    )
    db.add(user)
    db.commit()

    # Tentar cadastrar com mesmo email
    payload = {
        "email": "dup@example.com",
        "password": "password",
        "cpf": "999.999.999-99",
        "role": "CLIENTE"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "e-mail" in response.json()["detail"].lower()

    # Tentar cadastrar com mesmo CPF
    payload["email"] = "other@example.com"
    payload["cpf"] = "111.222.333-44"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "cpf" in response.json()["detail"].lower()


def test_login_success(client: TestClient, db: Session):
    """
    Testa o login bem-sucedido, a emissão do token e o salvamento em cookies.
    """
    # Cadastrar usuário usando a API para salvar a senha com hash correto
    register_payload = {
        "email": "login@example.com",
        "password": "mypassword123",
        "cpf": "222.333.444-55",
        "role": "CLIENTE"
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Tentar realizar login
    login_payload = {
        "email": "login@example.com",
        "password": "mypassword123"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    assert "access_token" in response.json()
    
    # Verificar se os cookies httpOnly foram setados na resposta
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


def test_login_invalid_credentials(client: TestClient):
    """
    Testa a falha de login com credenciais incorretas.
    """
    login_payload = {
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401


def test_get_me_protected_route(client: TestClient):
    """
    Testa a rota protegida /users/me com e sem token de autenticação.
    """
    # 1. Sem token
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401

    # 2. Registrar e fazer login para obter cookies
    register_payload = {
        "email": "auth_me@example.com",
        "password": "secretpassword",
        "cpf": "333.444.555-66",
        "role": "CLIENTE"
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "auth_me@example.com",
        "password": "secretpassword"
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200

    # Os cookies de autenticação devem ser incluídos automaticamente pelo client
    me_response = client.get("/api/v1/users/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "auth_me@example.com"


def test_refresh_token_endpoint(client: TestClient):
    """
    Testa a renovação do access_token usando o refresh_token dos cookies.
    """
    # Registrar e logar
    register_payload = {
        "email": "refresh_test@example.com",
        "password": "secretpassword",
        "cpf": "444.555.666-77",
        "role": "CLIENTE"
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "refresh_test@example.com",
        "password": "secretpassword"
    }
    client.post("/api/v1/auth/login", json=login_payload)
    
    # Limpar cookie do access_token para forçar o uso do refresh
    del client.cookies["access_token"]

    # Chamar refresh
    response = client.post("/api/v1/api/v1/auth/refresh" if False else "/api/v1/auth/refresh")
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert client.cookies.get("access_token") is not None


def test_logout(client: TestClient):
    """
    Testa o logout e a remoção de cookies.
    """
    # Registrar e logar
    register_payload = {
        "email": "logout_test@example.com",
        "password": "secretpassword",
        "cpf": "555.666.777-88",
        "role": "CLIENTE"
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "logout_test@example.com",
        "password": "secretpassword"
    }
    client.post("/api/v1/auth/login", json=login_payload)
    
    assert client.cookies.get("access_token") is not None

    # Fazer logout
    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200
    
    # O client remove os cookies após a expiração de deleção
    assert client.cookies.get("access_token") is None or client.cookies.get("access_token") == ""
