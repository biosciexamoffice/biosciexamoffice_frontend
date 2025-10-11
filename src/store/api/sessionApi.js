import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const sessionApi = createApi({
  reducerPath: 'sessionApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: 'http://localhost:10000/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    }
  }),
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
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useGetCurrentSessionQuery
} = sessionApi;
