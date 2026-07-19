import { apiSlice } from '../../store/apiSlice';
import type {
  Category,
  Product,
  PaginatedProducts,
  GetProductsParams,
} from './types';

export const catalogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Categories
    getCategories: builder.query<Category[], { include_inactive?: boolean } | void>({
      query: (params) => ({
        url: '/catalog/categories',
        params: params || {},
      }),
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, Omit<Category, 'id'>>({
      query: (body) => ({
        url: '/catalog/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<Category, { id: string; body: Partial<Omit<Category, 'id'>> }>({
      query: ({ id, body }) => ({
        url: `/catalog/categories/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<{ detail: string }, string>({
      query: (id) => ({
        url: `/catalog/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),

    // Products
    getProducts: builder.query<PaginatedProducts, GetProductsParams | void>({
      query: (params) => ({
        url: '/catalog/products',
        params: params || {},
      }),
      providesTags: ['Product'],
    }),
    getProduct: builder.query<Product, string>({
      query: (id) => `/catalog/products/${id}`,
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation<Product, Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'inventory'>>({
      query: (body) => ({
        url: '/catalog/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<Product, { id: string; body: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'inventory'>> }>({
      query: ({ id, body }) => ({
        url: `/catalog/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation<{ detail: string }, string>({
      query: (id) => ({
        url: `/catalog/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),

    // Image Upload
    uploadImage: builder.mutation<{ image_url: string }, FormData>({
      query: (body) => ({
        url: '/catalog/upload-image',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadImageMutation,
} = catalogApi;
