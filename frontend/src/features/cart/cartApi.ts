import { apiSlice } from '../../store/apiSlice';
import type { CartOut, CartItemCreate, CartItemUpdate, CartItemOut } from './types';

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query<CartOut, void>({
      query: () => '/cart/',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<CartItemOut, CartItemCreate>({
      query: (body) => ({
        url: '/cart/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation<CartItemOut, { itemId: string; body: CartItemUpdate }>({
      query: ({ itemId, body }) => ({
        url: `/cart/items/${itemId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCart: builder.mutation<void, string>({
      query: (itemId) => ({
        url: `/cart/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation<void, void>({
      query: () => ({
        url: '/cart/',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} = cartApi;
