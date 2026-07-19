import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, Address
from app.core.security import get_password_hash

def create_user_helper(db: Session, email: str, cpf: str, role: UserRole = UserRole.CLIENTE):
    hashed_pwd = get_password_hash("password123")
    user = User(
        email=email,
        hashed_password=hashed_pwd,
        cpf=cpf,
        role=role,
        is_active=True,
        first_name="Test",
        last_name=role.value.capitalize(),
        phone="85999999999"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def login_as_user(client: TestClient, db: Session, email: str, cpf: str, role: UserRole = UserRole.CLIENTE):
    user = create_user_helper(db, email, cpf, role)
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login_resp.status_code == 200
    return user

def test_get_addresses_empty_and_list(client: TestClient, db: Session):
    # 1. Sem login -> 401
    resp = client.get("/api/v1/users/me/addresses")
    assert resp.status_code == 401

    # 2. Login
    user = login_as_user(client, db, "user1@example.com", "111.111.111-11")

    # 3. Retorna lista vazia
    resp = client.get("/api/v1/users/me/addresses")
    assert resp.status_code == 200
    assert resp.json() == []

    # 4. Adiciona endereço no DB diretamente e lista
    addr = Address(
        user_id=user.id,
        street="Rua A",
        number="123",
        complement="Apto 101",
        neighborhood="Centro",
        city="Fortaleza",
        state="CE",
        zip_code="60123-456",
        is_default=True
    )
    db.add(addr)
    db.commit()

    resp = client.get("/api/v1/users/me/addresses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["street"] == "Rua A"
    assert data[0]["zip_code"] == "60123-456"
    assert data[0]["is_default"] is True

def test_get_addresses_isolation(client: TestClient, db: Session):
    # Cria user1 e user2
    user1 = login_as_user(client, db, "user1@example.com", "111.111.111-11")
    
    # Adiciona endereço para user1
    addr1 = Address(
        user_id=user1.id,
        street="Rua A",
        number="123",
        neighborhood="Centro",
        city="Fortaleza",
        state="CE",
        zip_code="60123-456",
        is_default=True
    )
    db.add(addr1)
    db.commit()

    # Limpa cookies e loga como user2
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]
    user2 = login_as_user(client, db, "user2@example.com", "222.222.222-22")

    # Adiciona endereço para user2
    addr2 = Address(
        user_id=user2.id,
        street="Rua B",
        number="456",
        neighborhood="Centro",
        city="Caucaia",
        state="CE",
        zip_code="61600-000",
        is_default=True
    )
    db.add(addr2)
    db.commit()

    # User2 só deve ver o seu endereço
    resp = client.get("/api/v1/users/me/addresses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["street"] == "Rua B"

def test_create_address_success_and_validation(client: TestClient, db: Session):
    user = login_as_user(client, db, "user1@example.com", "111.111.111-11")

    # 1. Cria com dados corretos
    payload = {
        "street": "Avenida Beira Mar",
        "number": "1000",
        "complement": "Bloco B",
        "neighborhood": "Meireles",
        "city": "Fortaleza",
        "state": "CE",
        "zip_code": "60165-121",
        "is_default": True
    }
    resp = client.post("/api/v1/users/me/addresses", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["street"] == "Avenida Beira Mar"
    assert data["state"] == "CE"
    assert data["zip_code"] == "60165-121"
    assert data["is_default"] is True
    assert data["user_id"] == str(user.id)
    assert "id" in data

    # 2. Validação de estado com mais de 2 caracteres
    payload_bad_state = payload.copy()
    payload_bad_state["state"] = "CEARÁ"
    resp = client.post("/api/v1/users/me/addresses", json=payload_bad_state)
    assert resp.status_code == 422

    # 3. Validação de CEP inválido
    payload_bad_zip = payload.copy()
    payload_bad_zip["zip_code"] = "60165121" # sem traço
    resp = client.post("/api/v1/users/me/addresses", json=payload_bad_zip)
    assert resp.status_code == 422

    payload_bad_zip2 = payload.copy()
    payload_bad_zip2["zip_code"] = "6016-121" # formato errado
    resp = client.post("/api/v1/users/me/addresses", json=payload_bad_zip2)
    assert resp.status_code == 422

def test_create_address_default_toggle(client: TestClient, db: Session):
    user = login_as_user(client, db, "user1@example.com", "111.111.111-11")

    # Cria primeiro endereço padrão
    resp1 = client.post("/api/v1/users/me/addresses", json={
        "street": "Rua 1",
        "number": "10",
        "neighborhood": "Bairro 1",
        "city": "Cidade 1",
        "state": "CE",
        "zip_code": "60123-456",
        "is_default": True
    })
    assert resp1.status_code == 201
    id1 = resp1.json()["id"]

    # Cria segundo endereço sem ser padrão
    resp2 = client.post("/api/v1/users/me/addresses", json={
        "street": "Rua 2",
        "number": "20",
        "neighborhood": "Bairro 2",
        "city": "Cidade 2",
        "state": "SP",
        "zip_code": "01234-567",
        "is_default": False
    })
    assert resp2.status_code == 201
    id2 = resp2.json()["id"]

    # Verifica status dos dois no banco
    addr1 = db.query(Address).filter(Address.id == uuid.UUID(id1)).first()
    addr2 = db.query(Address).filter(Address.id == uuid.UUID(id2)).first()
    assert addr1.is_default is True
    assert addr2.is_default is False

    # Cria terceiro endereço padrão (deve definir 1 e 2 como is_default=False)
    resp3 = client.post("/api/v1/users/me/addresses", json={
        "street": "Rua 3",
        "number": "30",
        "neighborhood": "Bairro 3",
        "city": "Cidade 3",
        "state": "RJ",
        "zip_code": "20000-000",
        "is_default": True
    })
    assert resp3.status_code == 201
    id3 = resp3.json()["id"]

    # Refresha do banco
    db.expire_all()
    addr1_updated = db.query(Address).filter(Address.id == uuid.UUID(id1)).first()
    addr2_updated = db.query(Address).filter(Address.id == uuid.UUID(id2)).first()
    addr3_updated = db.query(Address).filter(Address.id == uuid.UUID(id3)).first()

    assert addr1_updated.is_default is False
    assert addr2_updated.is_default is False
    assert addr3_updated.is_default is True

def test_update_address_success_and_default_toggle(client: TestClient, db: Session):
    user = login_as_user(client, db, "user1@example.com", "111.111.111-11")

    # Adiciona 2 endereços no DB
    addr1 = Address(
        user_id=user.id, street="Rua 1", number="10", neighborhood="B1", city="C1", state="CE", zip_code="60000-000", is_default=True
    )
    addr2 = Address(
        user_id=user.id, street="Rua 2", number="20", neighborhood="B2", city="C2", state="SP", zip_code="01000-000", is_default=False
    )
    db.add_all([addr1, addr2])
    db.commit()

    # 1. Atualiza parcialmente rua de addr1
    resp = client.put(f"/api/v1/users/me/addresses/{addr1.id}", json={"street": "Rua 1 Alterada"})
    assert resp.status_code == 200
    assert resp.json()["street"] == "Rua 1 Alterada"
    assert resp.json()["number"] == "10" # manteve antigo

    # 2. Atualiza addr2 para is_default=True (deve desativar addr1)
    resp = client.put(f"/api/v1/users/me/addresses/{addr2.id}", json={"is_default": True})
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    db.expire_all()
    addr1_db = db.query(Address).filter(Address.id == addr1.id).first()
    addr2_db = db.query(Address).filter(Address.id == addr2.id).first()
    assert addr1_db.is_default is False
    assert addr2_db.is_default is True

    # 3. Validação de CEP inválido no update
    resp = client.put(f"/api/v1/users/me/addresses/{addr1.id}", json={"zip_code": "invalid-zip"})
    assert resp.status_code == 422

def test_update_address_not_owned_or_not_found(client: TestClient, db: Session):
    user1 = login_as_user(client, db, "user1@example.com", "111.111.111-11")
    addr1 = Address(
        user_id=user1.id, street="Rua 1", number="10", neighborhood="B1", city="C1", state="CE", zip_code="60000-000", is_default=True
    )
    db.add(addr1)
    db.commit()

    # Desloga user1 e loga user2
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]
    user2 = login_as_user(client, db, "user2@example.com", "222.222.222-22")

    # Tenta atualizar endereço de user1 como user2 -> deve retornar 404
    resp = client.put(f"/api/v1/users/me/addresses/{addr1.id}", json={"street": "Invasão"})
    assert resp.status_code == 404

    # Tenta atualizar ID inexistente -> deve retornar 404
    resp = client.put(f"/api/v1/users/me/addresses/{uuid.uuid4()}", json={"street": "Inexistente"})
    assert resp.status_code == 404

def test_delete_address_success_and_failures(client: TestClient, db: Session):
    user1 = login_as_user(client, db, "user1@example.com", "111.111.111-11")
    addr1 = Address(
        user_id=user1.id, street="Rua 1", number="10", neighborhood="B1", city="C1", state="CE", zip_code="60000-000", is_default=True
    )
    db.add(addr1)
    db.commit()

    # Desloga user1 e loga user2
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]
    user2 = login_as_user(client, db, "user2@example.com", "222.222.222-22")

    # 1. Tenta deletar endereço de user1 como user2 -> deve retornar 404
    resp = client.delete(f"/api/v1/users/me/addresses/{addr1.id}")
    assert resp.status_code == 404

    # 2. Tenta deletar ID inexistente -> deve retornar 404
    resp = client.delete(f"/api/v1/users/me/addresses/{uuid.uuid4()}")
    assert resp.status_code == 404

    # Desloga user2 e loga user1 (sem criar o usuário novamente para evitar erros de constraint única)
    del client.cookies["access_token"]
    del client.cookies["refresh_token"]
    login_resp = client.post("/api/v1/auth/login", json={"email": "user1@example.com", "password": "password123"})
    assert login_resp.status_code == 200

    # 3. Deleta com sucesso como user1
    resp = client.delete(f"/api/v1/users/me/addresses/{addr1.id}")
    assert resp.status_code == 200
    assert "excluído" in resp.json()["detail"].lower()

    # Confirma deleção no DB
    deleted_addr = db.query(Address).filter(Address.id == addr1.id).first()
    assert deleted_addr is None

def test_user_out_optional_addresses(client: TestClient, db: Session):
    user = login_as_user(client, db, "user1@example.com", "111.111.111-11")
    addr = Address(
        user_id=user.id,
        street="Rua A",
        number="123",
        neighborhood="Centro",
        city="Fortaleza",
        state="CE",
        zip_code="60123-456",
        is_default=True
    )
    db.add(addr)
    db.commit()

    # Retorna o perfil completo do usuário
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "addresses" in data
    if data["addresses"] is not None:
        assert len(data["addresses"]) == 1
        assert data["addresses"][0]["street"] == "Rua A"
