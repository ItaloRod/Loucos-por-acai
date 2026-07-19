import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.core.auth import RequireRole
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserUpdate, CustomerOut, PaginatedCustomerOut

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/", response_model=PaginatedCustomerOut)
def list_customers(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.FUNCIONARIO, UserRole.GERENTE))
):
    """
    Lista usuários com papel CLIENTE.
    Acesso restrito a FUNCIONARIO e GERENTE.
    Suporta paginação e busca nos campos email, first_name, last_name, cpf e phone.
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    query = db.query(User).filter(User.role == UserRole.CLIENTE)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) |
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.cpf.ilike(search_filter)) |
            (User.phone.ilike(search_filter))
        )

    total = query.count()
    pages = (total + page_size - 1) // page_size if total > 0 else 1

    offset = (page - 1) * page_size
    items = query.options(joinedload(User.stamp_card)).offset(offset).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages
    }


@router.get("/{id}", response_model=CustomerOut)
def get_customer(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.FUNCIONARIO, UserRole.GERENTE))
):
    """
    Retorna os detalhes de um CLIENTE específico por ID, incluindo informações do seu StampCard.
    Acesso restrito a FUNCIONARIO e GERENTE.
    """
    customer = (
        db.query(User)
        .options(joinedload(User.stamp_card))
        .filter(User.id == id, User.role == UserRole.CLIENTE)
        .first()
    )
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado."
        )
    return customer


def normalize_cpf(cpf: str) -> str:
    # Remove non-digits
    digits = "".join(char for char in cpf if char.isdigit())
    if len(digits) == 11:
        return f"{digits[0:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:11]}"
    return cpf


@router.get("/cpf/{cpf}", response_model=CustomerOut)
def get_customer_by_cpf(
    cpf: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.FUNCIONARIO, UserRole.GERENTE))
):
    """
    Busca um CLIENTE por CPF (normalizando formatação com pontos e traço).
    Acesso restrito a FUNCIONARIO e GERENTE.
    """
    normalized = normalize_cpf(cpf)
    customer = (
        db.query(User)
        .options(joinedload(User.stamp_card))
        .filter(User.cpf == normalized, User.role == UserRole.CLIENTE)
        .first()
    )
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado."
        )
    return customer



@router.put("/{id}", response_model=CustomerOut)
def update_customer(
    id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Atualiza os detalhes de um CLIENTE específico.
    Acesso restrito a GERENTE.
    """
    customer = (
        db.query(User)
        .options(joinedload(User.stamp_card))
        .filter(User.id == id, User.role == UserRole.CLIENTE)
        .first()
    )
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado."
        )

    # Validar duplicidade de email
    if payload.email and payload.email != customer.email:
        email_exists = db.query(User).filter(User.email == payload.email).first()
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado."
            )
        customer.email = payload.email

    # Validar duplicidade de CPF
    if payload.cpf and payload.cpf != customer.cpf:
        cpf_exists = db.query(User).filter(User.cpf == payload.cpf).first()
        if cpf_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF já cadastrado."
            )
        customer.cpf = payload.cpf

    # Atualizar outros campos
    if payload.first_name is not None:
        customer.first_name = payload.first_name
    if payload.last_name is not None:
        customer.last_name = payload.last_name
    if payload.phone is not None:
        customer.phone = payload.phone
    if payload.role is not None:
        customer.role = payload.role
    if payload.is_active is not None:
        customer.is_active = payload.is_active
    if payload.password:
        customer.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(customer)
    return customer
