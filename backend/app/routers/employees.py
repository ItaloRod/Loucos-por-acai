import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import RequireRole
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserOut, PaginatedEmployeeOut

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("/", response_model=PaginatedEmployeeOut)
def list_employees(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Lista usuários com papel FUNCIONARIO ou GERENTE.
    Acesso restrito a GERENTE.
    Suporta paginação e busca nos campos email, first_name, last_name, cpf e phone.
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    query = db.query(User).filter(User.role.in_([UserRole.FUNCIONARIO, UserRole.GERENTE]))

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
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages
    }


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: UserCreate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Cria um novo funcionário ou gerente com hash seguro de senha.
    Acesso restrito a GERENTE.
    """
    if payload.role not in [UserRole.FUNCIONARIO, UserRole.GERENTE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O papel (role) deve ser FUNCIONARIO ou GERENTE."
        )

    # Verificar duplicidades
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já cadastrado."
        )
    if db.query(User).filter(User.cpf == payload.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF já cadastrado."
        )

    hashed_pwd = get_password_hash(payload.password)
    new_employee = User(
        email=payload.email,
        hashed_password=hashed_pwd,
        first_name=payload.first_name,
        last_name=payload.last_name,
        cpf=payload.cpf,
        phone=payload.phone,
        role=payload.role,
        is_active=True,
        must_change_password=False
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return new_employee


@router.get("/{id}", response_model=UserOut)
def get_employee(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Retorna os detalhes de um funcionário ou gerente específico por ID.
    Acesso restrito a GERENTE.
    """
    employee = (
        db.query(User)
        .filter(User.id == id, User.role.in_([UserRole.FUNCIONARIO, UserRole.GERENTE]))
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funcionário não encontrado."
        )
    return employee


@router.put("/{id}", response_model=UserOut)
def update_employee(
    id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Atualiza os detalhes de um funcionário ou gerente específico por ID.
    Acesso restrito a GERENTE.
    """
    employee = (
        db.query(User)
        .filter(User.id == id, User.role.in_([UserRole.FUNCIONARIO, UserRole.GERENTE]))
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funcionário não encontrado."
        )

    # Validar duplicidade de email
    if payload.email and payload.email != employee.email:
        email_exists = db.query(User).filter(User.email == payload.email).first()
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado."
            )
        employee.email = payload.email

    # Validar duplicidade de CPF
    if payload.cpf and payload.cpf != employee.cpf:
        cpf_exists = db.query(User).filter(User.cpf == payload.cpf).first()
        if cpf_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF já cadastrado."
            )
        employee.cpf = payload.cpf

    # Atualizar outros campos
    if payload.first_name is not None:
        employee.first_name = payload.first_name
    if payload.last_name is not None:
        employee.last_name = payload.last_name
    if payload.phone is not None:
        employee.phone = payload.phone
    if payload.role is not None:
        if payload.role not in [UserRole.FUNCIONARIO, UserRole.GERENTE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O papel (role) deve ser FUNCIONARIO ou GERENTE."
            )
        employee.role = payload.role
    if payload.is_active is not None:
        # Se for autodesativação por is_active=False
        if id == gerente_user.id and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode desativar sua própria conta de gerente."
            )
        employee.is_active = payload.is_active
    if payload.password:
        employee.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_employee(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Desativa um funcionário (Soft-delete via flag is_active=False).
    Acesso restrito a GERENTE.
    """
    employee = (
        db.query(User)
        .filter(User.id == id, User.role.in_([UserRole.FUNCIONARIO, UserRole.GERENTE]))
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funcionário não encontrado."
        )

    if employee.id == gerente_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar sua própria conta de gerente."
        )

    employee.is_active = False
    db.commit()
    return {"detail": f"Funcionário {employee.email} desativado com sucesso."}
