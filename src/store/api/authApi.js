import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';
import { setCredentials, logout } from '../features/authSlice';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery,
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.token && data?.user) {
            dispatch(setCredentials({ token: data.token, user: data.user }));
          }
        } catch (err) {
          dispatch(logout());
        }
      },
    }),
    getProfile: builder.query({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    updateProfile: builder.mutation({
      query: (payload) => ({
        url: '/auth/me',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['Me', 'User'],
      async onQueryStarted(args, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const token = getState()?.auth?.token;
          if (data?.user && token) {
            dispatch(setCredentials({ token, user: data.user }));
          }
        } catch (err) {
          console.error('Update profile mutation error:', err);
        }
      },
    }),
    updatePassword: builder.mutation({
      query: (payload) => ({
        url: '/auth/me/password',
        method: 'PATCH',
        body: payload,
      }),
    }),
    getUsers: builder.query({
      query: () => '/auth/users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation({
      query: (payload) => ({
        url: '/auth/users',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ userId, ...updates }) => ({
        url: `/auth/users/${userId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/auth/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
  tagTypes: ['User', 'Me'],
});

export const {
  useLoginMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = authApi;
