export interface CartItemOut {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  options_selected: string[] | null;
  notes: string | null;
}

export interface CartOut {
  id: string;
  user_id: string;
  expires_at: string;
  items: CartItemOut[];
}

export interface CartItemCreate {
  product_id: string;
  quantity: number;
  options_selected?: string[];
  notes?: string;
}

export interface CartItemUpdate {
  quantity?: number;
  notes?: string;
}
