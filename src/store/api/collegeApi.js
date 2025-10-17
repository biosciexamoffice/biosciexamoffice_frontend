import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const collegeApi = createApi({
  reducerPath: 'collegeApi',
  baseQuery,
  tagTypes: ['College'],
  endpoints: (builder) => ({
    listColleges: builder.query({
      query: () => ({
        url: '/colleges',
        method: 'GET',
      }),
      providesTags: (result) =>
        result?.colleges?.length
          ? [
              ...result.colleges.map(({ id }) => ({ type: 'College', id })),
              { type: 'College', id: 'LIST' },
            ]
          : [{ type: 'College', id: 'LIST' }],
    }),
    createCollege: builder.mutation({
      query: (body) => ({
        url: '/colleges',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'College', id: 'LIST' }],
    }),
    deleteCollege: builder.mutation({
      query: (collegeId) => ({
        url: `/colleges/${collegeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'College', id: 'LIST' },
        { type: 'College', id: arg },
      ],
    }),
    createDepartment: builder.mutation({
      query: (body) => ({
        url: '/departments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'College', id: 'LIST' }],
    }),
    deleteDepartment: builder.mutation({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'College', id: 'LIST' }],
    }),
  }),
});

export const {
  useListCollegesQuery,
  useCreateCollegeMutation,
  useDeleteCollegeMutation,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
} = collegeApi;