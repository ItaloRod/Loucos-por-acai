import { apiSlice } from '../../store/apiSlice';
import type {
  OrderOut,
  OrderCreate,
  OrderStatusUpdate,
  OrderCancelRequest,
  OrderStatus
} from './types';

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<OrderOut[], { status?: OrderStatus } | void>({
      query: (params) => {
        let url = '/orders/';
        if (params && params.status) {
          url += `?status=${params.status}`;
        }
        return url;
      },
      providesTags: ['Order'],
    }),
    getOrderById: builder.query<OrderOut, string>({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_result, _error, arg) => [{ type: 'Order', id: arg }],
    }),
    createOrder: builder.mutation<OrderOut, OrderCreate>({
      query: (body) => ({
        url: '/orders/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order', 'Cart', 'Loyalty'], // Invalidates cart since backend handles it, and loyalty if discount used
    }),
    updateOrderStatus: builder.mutation<OrderOut, { orderId: string; body: OrderStatusUpdate }>({
      query: ({ orderId, body }) => ({
        url: `/orders/${orderId}/status`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Order', id: arg.orderId }, 'Order'],
    }),
    cancelOrder: builder.mutation<OrderOut, { orderId: string; body?: OrderCancelRequest }>({
      query: ({ orderId, body }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Order', id: arg.orderId }, 'Order'],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
} = ordersApi;
