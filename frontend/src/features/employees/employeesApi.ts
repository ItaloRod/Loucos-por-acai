import { apiSlice } from '../../store/apiSlice';
import type { User } from '../../store/authSlice';
import type {
  GetEmployeesParams,
  PaginatedEmployees,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
} from './types';

export const employeesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query<PaginatedEmployees, GetEmployeesParams | void>({
      query: (params) => ({
        url: '/employees',
        params: params || {},
      }),
      providesTags: ['User'],
    }),
    createEmployee: builder.mutation<User, EmployeeCreatePayload>({
      query: (body) => ({
        url: '/employees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateEmployee: builder.mutation<User, { id: string; body: EmployeeUpdatePayload }>({
      query: ({ id, body }) => ({
        url: `/employees/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    deleteEmployee: builder.mutation<{ detail: string }, string>({
      query: (id) => ({
        url: `/employees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeesApi;
