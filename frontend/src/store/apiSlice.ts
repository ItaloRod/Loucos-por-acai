import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1',
    credentials: 'include',
    prepareHeaders: (headers) => {
      // Como o JWT usará cookies httpOnly, as requisições autenticadas
      // incluirão automaticamente as credenciais por padrão no fetch.
      return headers;
    },
  }),
  tagTypes: ['User', 'Product', 'Order', 'Loyalty', 'Category'],
  endpoints: () => ({}),
});
