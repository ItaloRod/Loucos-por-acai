import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from decimal import Decimal
from app.models.user import User, Address, UserRole
from app.models.product import Category, Product, Inventory
from app.models.loyalty import StampCard

def test_create_user(db: Session):
    """
    Testa a criação de um usuário simples no banco de dados.
    """
    user = User(
        email="test@example.com",
        hashed_password="hashedpassword123",
        first_name="Test",
        last_name="User",
        cpf="123.456.789-00",
        role=UserRole.CLIENTE
    )
    db.add(user)
    db.commit()

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.is_active is True
    assert user.must_change_password is False


def test_user_address_relationship(db: Session):
    """
    Testa o relacionamento um-para-muitos entre User e Address.
    """
    user = User(
        email="test_addr@example.com",
        hashed_password="hashedpassword123",
        cpf="123.456.789-01",
        role=UserRole.CLIENTE
    )
    db.add(user)
    db.flush()

    address = Address(
        user_id=user.id,
        street="Rua dos Açaís",
        number="100",
        neighborhood="Centro",
        city="Fortaleza",
        state="CE",
        zip_code="60000-000",
        is_default=True
    )
    db.add(address)
    db.commit()

    # Verificar relacionamento bidirecional
    db.refresh(user)
    assert len(user.addresses) == 1
    assert user.addresses[0].street == "Rua dos Açaís"
    assert address.user.email == "test_addr@example.com"


def test_create_category_and_product(db: Session):
    """
    Testa a criação de uma categoria, um produto associado e seu inventário.
    """
    category = Category(
        name="Açaí Tradicional",
        slug="acai-tradicional",
        description="Copos e tigelas de açaí puro"
    )
    db.add(category)
    db.flush()

    product = Product(
        name="Copo Açaí 500ml",
        slug="copo-acai-500ml",
        price=Decimal("18.50"),
        category_id=category.id,
        is_base=True
    )
    db.add(product)
    db.flush()

    inventory = Inventory(
        product_id=product.id,
        quantity=50,
        unit="unidade"
    )
    db.add(inventory)
    db.commit()

    db.refresh(product)
    assert product.category.name == "Açaí Tradicional"
    assert product.inventory.quantity == 50
    assert inventory.product.name == "Copo Açaí 500ml"


def test_product_price_non_negative_constraint(db: Session):
    """
    Valida se a regra de restrição de preço não-negativo impede preços inválidos.
    """
    category = Category(name="Drinks", slug="drinks")
    db.add(category)
    db.flush()

    # Preço negativo deve falhar
    product = Product(
        name="Copo Inválido",
        slug="copo-invalido",
        price=Decimal("-5.00"),
        category_id=category.id
    )
    db.add(product)
    
    with pytest.raises(IntegrityError):
        db.commit()


def test_stamp_card_one_to_one_user(db: Session):
    """
    Testa o relacionamento de Cartão Fidelidade associado ao cliente.
    """
    user = User(
        email="client_loyalty@example.com",
        hashed_password="pwd",
        cpf="123.456.789-03",
        role=UserRole.CLIENTE
    )
    db.add(user)
    db.flush()

    stamp_card = StampCard(
        customer_id=user.id,
        current_stamps=5
    )
    db.add(stamp_card)
    db.commit()

    db.refresh(user)
    assert user.stamp_card is not None
    assert user.stamp_card.current_stamps == 5
