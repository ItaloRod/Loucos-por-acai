from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

# Contexto para hashing de senhas com bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha em texto claro corresponde ao hash do banco de dados.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Gera o hash bcrypt de uma senha.
    """
    return pwd_context.hash(password)

def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """
    Gera um JWT Access Token com tempo de expiração curto (padrão: 15 minutos).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """
    Gera um JWT Refresh Token com tempo de expiração longo (padrão: 7 dias).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
        
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """
    Decodifica e valida um token JWT. Dispara JWTError em caso de falha.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
