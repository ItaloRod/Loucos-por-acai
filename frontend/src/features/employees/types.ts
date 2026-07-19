import type { User, UserRole } from '../../store/authSlice';

export interface GetEmployeesParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface PaginatedEmployees {
  items: User[];
  total: number;
  page: number;
  pages: number;
}

export interface EmployeeCreatePayload {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  cpf: string;
  phone?: string | null;
  role: UserRole;
  password?: string;
}

export interface EmployeeUpdatePayload {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  cpf?: string;
  phone?: string | null;
  role?: UserRole;
  is_active?: boolean;
  password?: string | null;
}
