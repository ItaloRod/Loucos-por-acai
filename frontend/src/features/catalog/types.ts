export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  image_url: string | null;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  minimum_threshold: number;
  unit: string;
  last_restocked_at: string | null;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  is_available: boolean;
  is_topping: boolean;
  is_base: boolean;
  tags: string[] | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  inventory?: Inventory | null;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface GetProductsParams {
  category_id?: string;
  include_unavailable?: boolean;
  is_topping?: boolean;
  is_base?: boolean;
  search?: string;
  tags?: string;
  page?: number;
  page_size?: number;
}
