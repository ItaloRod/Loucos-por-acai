export interface SalesGroupSummary {
  count: number;
  revenue: number;
}

export interface DailySummary {
  total_orders: number;
  total_revenue: number;
  by_payment_method: Record<string, SalesGroupSummary>;
  by_order_type: Record<string, SalesGroupSummary>;
}
