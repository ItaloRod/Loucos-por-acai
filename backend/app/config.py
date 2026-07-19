from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Loucos por Açaí API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Banco de dados
    DATABASE_URL: str = "sqlite:///./loucosporacai.db"
    
    # Segurança
    JWT_SECRET_KEY: str = "super_secret_acai_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias por conveniência
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
