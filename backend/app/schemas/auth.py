from pydantic import BaseModel, EmailStr, Field

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PasswordChangePayload(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=100)
