import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const sessionApi = createApi({
  reducerPath: 'sessionApi',
  baseQuery,
  tagTypes: ['Session'],
  endpoints: (builder) => ({
    createSession: builder.mutation({
      query: (newSession) => ({
        url: '/sessions',
        method: 'POST',
        body: newSession,
      }),
      invalidatesTags: ['Session']
    }),
    closeSession: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/sessions/${id}/close`,
        method: 'POST',
        body: payload ?? {},
      }),
      invalidatesTags: ['Session']
    }),
    updateSession: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/sessions/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Session']
    }),
    deleteSession: builder.mutation({
      query: ({ id }) => ({
        url: `/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session']
    }),
    getSessions: builder.query({
      query: () => '/sessions',
      providesTags: ['Session'],
      transformResponse: (response) => response?.sessions || []
    }),
    getSessionById: builder.query({
      query: (id) => `/sessions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Session', id }]
    }),
    getCurrentSession: builder.query({
      query: () => '/sessions/current',
      providesTags: ['Session']
    })
  }),
});

export const { 
  useCreateSessionMutation,
  useCloseSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useGetCurrentSessionQuery
} = sessionApi;
