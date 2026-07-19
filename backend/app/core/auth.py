from fastapi import Depends, HTTPException, status, Request
from jose import JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

def get_token_from_cookies_or_headers(request: Request) -> str | None:
    """
    Extrai o token dos cookies (access_token) ou do cabeçalho de Authorization.
    """
    # 1. Tentar ler do cookie
    token = request.cookies.get("access_token")
    if token:
        if token.startswith("Bearer "):
            token = token[7:]
        return token
    
    # 2. Tentar ler do header Authorization
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
        
    return None

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependência para obter o usuário atualmente autenticado a partir do token.
    """
    token = get_token_from_cookies_or_headers(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado. Token ausente.",
        )
        
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
        )
        
    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido (ID inválido).",
        )
        
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo.",
        )
        
    return user

class RequireRole:
    """
    Dependência parametrizada para exigir papéis específicos do usuário autenticado.
    """
    def __init__(self, *allowed_roles: UserRole):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para realizar esta ação.",
            )
        return current_user
