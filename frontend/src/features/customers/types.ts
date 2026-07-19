import type { User } from '../../store/authSlice';

export interface StampCard {
  id: string;
  customer_id: string;
  current_stamps: number;
  total_stamps_earned: number;
  total_redemptions: number;
  created_at: string;
  updated_at: string;
}

export interface Customer extends User {
  stamp_card?: StampCard | null;
}

export interface GetCustomersParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  pages: number;
}

export interface CustomerUpdatePayload {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  cpf?: string;
  phone?: string | null;
  role?: string;
  is_active?: boolean;
  password?: string | null;
}
