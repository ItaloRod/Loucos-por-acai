import { apiSlice } from '../../store/apiSlice';
import type { DailySummary } from './types';

export const salesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDailySummary: builder.query<DailySummary, void>({
      query: () => '/sales/daily-summary',
      providesTags: ['Order'],
    }),
  }),
});

export const {
  useGetDailySummaryQuery,
} = salesApi;
