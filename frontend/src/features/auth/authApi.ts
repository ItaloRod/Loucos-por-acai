import { apiSlice } from '../../store/apiSlice';
import type { User } from '../../store/authSlice';
import type {
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  Address,
  AddressCreatePayload,
  AddressUpdatePayload,
} from './types';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<TokenResponse, LoginPayload>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation<User, RegisterPayload>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    getMe: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    refreshToken: builder.mutation<TokenResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),
    getAddresses: builder.query<Address[], void>({
      query: () => '/users/me/addresses',
      providesTags: ['User'],
    }),
    createAddress: builder.mutation<Address, AddressCreatePayload>({
      query: (body) => ({
        url: '/users/me/addresses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateAddress: builder.mutation<Address, { id: string; body: AddressUpdatePayload }>({
      query: ({ id, body }) => ({
        url: `/users/me/addresses/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    deleteAddress: builder.mutation<{ detail: string }, string>({
      query: (id) => ({
        url: `/users/me/addresses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRefreshTokenMutation,
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} = authApi;

