// store/apis/graduationApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const graduationApi = createApi({
  reducerPath: 'graduationApi',
  baseQuery,
  tagTypes: ['Graduation'],
  endpoints: (builder) => ({
    getGraduationAvailability: builder.query({
      query: ({ level }) => ({ url: '/graduation/available', params: { level } }),
    }),
    getGraduatingList: builder.query({
      query: ({ session, semester, level = 400 }) => ({
        url: '/graduation/list',
        params: { session, semester, level },
      }),
      providesTags: ['Graduation'],
    }),
    finalizeGraduation: builder.mutation({
      query: (body) => ({
        url: '/graduation/finalize',
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
