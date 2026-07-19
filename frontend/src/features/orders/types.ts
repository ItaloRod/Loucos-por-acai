export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERING: 'DELIVERING',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderType = {
  ONLINE_DELIVERY: 'ONLINE_DELIVERY',
  ONLINE_PICKUP: 'ONLINE_PICKUP',
  POS: 'POS',
} as const;

export type OrderType = typeof OrderType[keyof typeof OrderType];

export interface OrderItemOut {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  notes: string | null;
  parent_item_id: string | null;
  sub_items?: OrderItemOut[];
}

export interface OrderOut {
  id: string;
  order_number: string;
  customer_id: string;
  employee_id: string | null;
  status: OrderStatus;
  order_type: OrderType;
  subtotal: string;
  discount: string;
  total: string;
  delivery_address_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items: OrderItemOut[];
}

export interface OrderItemCreate {
  product_id: string;
  quantity: number;
  options_selected?: string[];
  notes?: string;
}

export interface OrderCreate {
  order_type: OrderType;
  items: OrderItemCreate[];
  delivery_address_id?: string;
  apply_stamps_discount: boolean;
  payment_method: string;
  customer_id?: string;
  cash_tendered?: number;
  change_due?: number;
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

export interface OrderCancelRequest {
  cancellation_reason?: string;
}
