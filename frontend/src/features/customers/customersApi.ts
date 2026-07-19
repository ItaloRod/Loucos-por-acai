import { apiSlice } from '../../store/apiSlice';
import type { Customer, GetCustomersParams, PaginatedCustomers, CustomerUpdatePayload } from './types';

export const customersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<PaginatedCustomers, GetCustomersParams | void>({
      query: (params) => ({
        url: '/customers',
        params: params || {},
      }),
      providesTags: ['User'],
    }),
    getCustomerById: builder.query<Customer, string>({
      query: (id) => `/customers/${id}`,
      providesTags: ['User'],
    }),
    updateCustomer: builder.mutation<Customer, { id: string; body: CustomerUpdatePayload }>({
      query: ({ id, body }) => ({
        url: `/customers/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useUpdateCustomerMutation,
} = customersApi;
