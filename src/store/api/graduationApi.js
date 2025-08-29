// store/apis/graduationApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const graduationApi = createApi({
  reducerPath: 'graduationApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
  tagTypes: ['Graduation'],
  endpoints: (builder) => ({
    getGraduationAvailability: builder.query({
      query: ({ level }) => ({ url: '/api/graduation/available', params: { level } }),
    }),
    getGraduatingList: builder.query({
      query: ({ session, semester, level = 400 }) => ({
        url: '/api/graduation/list',
        params: { session, semester, level },
      }),
      providesTags: ['Graduation'],
    }),
    finalizeGraduation: builder.mutation({
      query: (body) => ({
        url: '/api/graduation/finalize',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Graduation'],
    }),
  }),
});

export const {
  useGetGraduationAvailabilityQuery,
  useGetGraduatingListQuery,
  useFinalizeGraduationMutation,
} = graduationApi;
