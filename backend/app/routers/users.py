import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user, RequireRole
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.loyalty import StampCard
from app.schemas.user import UserUpdate, UserOut, UserCreate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def read_user_me(current_user: User = Depends(get_current_user)):
    """
    Retorna os dados do usuário atualmente autenticado.
    """
    return current_user


@router.put("/me", response_model=UserOut)
def update_user_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite ao usuário autenticado atualizar seus próprios dados cadastrais.
    """
    # Usuários normais não podem alterar seu próprio papel (role) ou status de ativo
    if payload.role is not None and payload.role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para alterar seu próprio papel de acesso."
        )
    if payload.is_active is not None and payload.is_active != current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para alterar seu status de ativo."
        )

    # Validar duplicidade de email
    if payload.email and payload.email != current_user.email:
        email_exists = db.query(User).filter(User.email == payload.email).first()
        if email_exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já cadastrado.")
        current_user.email = payload.email

    # Validar duplicidade de CPF
    if payload.cpf and payload.cpf != current_user.cpf:
        cpf_exists = db.query(User).filter(User.cpf == payload.cpf).first()
        if cpf_exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado.")
        current_user.cpf = payload.cpf

    # Atualizar campos adicionais
    if payload.first_name is not None:
        current_user.first_name = payload.first_name
    if payload.last_name is not None:
        current_user.last_name = payload.last_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.password:
        current_user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("", response_model=list[UserOut])
def list_users(
    role: UserRole | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.GERENTE, UserRole.FUNCIONARIO))
):
    """
    Lista os usuários cadastrados no sistema. Suporta filtragem por papel.
    Acesso restrito a GERENTE e FUNCIONARIO.
    """
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return users


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_admin(
    payload: UserCreate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Cria um novo usuário administrativamente (pode criar Funcionários e Gerentes).
    Acesso restrito a GERENTE.
    """
    # Verificar duplicidades
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já cadastrado.")
    if db.query(User).filter(User.cpf == payload.cpf).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado.")

    hashed_pwd = get_password_hash(payload.password)
    new_user = User(
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
    db.add(new_user)
    db.flush()

    if new_user.role == UserRole.CLIENTE:
        stamp_card = StampCard(
            customer_id=new_user.id,
            current_stamps=0,
            total_stamps_earned=0,
            total_redemptions=0
        )
        db.add(stamp_card)

    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/{user_id}", response_model=UserOut)
def read_user_by_id(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.GERENTE, UserRole.FUNCIONARIO))
):
    """
    Obtém detalhes de um usuário específico por ID.
    Acesso restrito a GERENTE e FUNCIONARIO.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user_admin(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Atualiza dados de qualquer usuário administrativamente.
    Acesso restrito a GERENTE.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    # Validar duplicidades
    if payload.email and payload.email != user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já cadastrado.")
        user.email = payload.email

    if payload.cpf and payload.cpf != user.cpf:
        if db.query(User).filter(User.cpf == payload.cpf).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado.")
        user.cpf = payload.cpf

    # Atualizar campos
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=dict)
def delete_user_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Desativa um usuário (Soft-delete via flag is_active=False) para preservar registros e logs.
    Acesso restrito a GERENTE.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    
    if user.id == gerente_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar sua própria conta de gerente."
        )

    user.is_active = False
    db.commit()
    return {"detail": f"Usuário {user.email} desativado com sucesso."}
