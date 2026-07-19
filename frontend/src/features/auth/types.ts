import { UserRole } from '../../store/authSlice';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password:  string;
  first_name: string;
  last_name: string;
  cpf: string;
  phone?: string;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
