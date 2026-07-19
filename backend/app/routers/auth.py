from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.limiter import limiter
from app.models.user import User, UserRole
from app.models.loyalty import StampCard
from app.schemas.user import UserCreate, UserOut
from app.schemas.auth import LoginPayload, Token
from jose import JWTError

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    """
    Registra um novo usuário no sistema. Se for CLIENTE, cria também seu cartão fidelidade.
    Limitação de taxa: 10 requisições por minuto por IP.
    """
    # Verificar se o e-mail já existe
    existing_user_email = db.query(User).filter(User.email == payload.email).first()
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este e-mail."
        )

    # Verificar se o CPF já existe
    existing_user_cpf = db.query(User).filter(User.cpf == payload.cpf).first()
    if existing_user_cpf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este CPF."
        )

    # Criar o novo usuário
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
    db.flush()  # Garante a geração do ID do usuário no banco

    # Se for CLIENTE, criar o cartão fidelidade
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


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    response: Response,
    payload: LoginPayload,
    db: Session = Depends(get_db)
):
    """
    Realiza o login do usuário, gerando tokens JWT e salvando-os em cookies HttpOnly.
    Limitação de taxa: 10 requisições por minuto por IP.
    """
    # Buscar usuário por e-mail
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo no sistema."
        )

    # Gerar os tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    # Salvar tokens nos cookies HttpOnly
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=15 * 60,  # 15 minutos
        samesite="lax",
        secure=False  # Altere para True em produção caso use HTTPS
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 dias
        samesite="lax",
        secure=False  # Altere para True em produção caso use HTTPS
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
@limiter.limit("10/minute")
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Renova o access_token utilizando o refresh_token salvo nos cookies.
    Limitação de taxa: 10 requisições por minuto por IP.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token ausente."
        )

    try:
        payload = decode_token(refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido."
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado ou inválido."
        )

    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido (ID inválido)."
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inválido ou inativo."
        )

    # Gerar novos tokens
    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    # Atualizar cookies
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=15 * 60,
        samesite="lax",
        secure=False
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False
    )

    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    """
    Realiza o logout do usuário, limpando os cookies HttpOnly.
    """
    response.delete_cookie(key="access_token", samesite="lax")
    response.delete_cookie(key="refresh_token", samesite="lax")
    return {"detail": "Logout realizado com sucesso."}
