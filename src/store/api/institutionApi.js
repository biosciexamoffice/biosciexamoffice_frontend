import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const institutionApi = createApi({
  reducerPath: 'institutionApi',
  baseQuery,
  tagTypes: ['College', 'Department', 'Programme'],
  endpoints: (builder) => ({
    getColleges: builder.query({
      query: () => '/colleges',
      providesTags: (result) => {
        if (!result?.colleges) {
          return ['College'];
        }
        const tags = result.colleges.map((college) => ({ type: 'College', id: college.id }));
        tags.push('College');
        return tags;
      },
    }),
    createCollege: builder.mutation({
      query: (payload) => ({
        url: '/colleges',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['College'],
    }),
    createDepartment: builder.mutation({
      query: (payload) => ({
        url: '/departments',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['College', 'Department', 'Programme'],
    }),
    updateDepartment: builder.mutation({
      query: ({ departmentId, ...changes }) => ({
        url: `/departments/${departmentId}`,
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: ['College', 'Department', 'Programme'],
    }),
    getDepartments: builder.query({
      query: (params) => ({
        url: '/departments',
        params,
      }),
      providesTags: ['Department'],
    }),
    getProgrammes: builder.query({
      query: (params) => ({
        url: '/programmes',
        params,
      }),
      providesTags: ['Programme'],
    }),
    createProgramme: builder.mutation({
      query: (payload) => ({
        url: '/programmes',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Programme'],
    }),
    updateCollege: builder.mutation({
      query: ({ collegeId, ...changes }) => ({
        url: `/colleges/${collegeId}`,
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: ['College', 'Department', 'Programme'],
    }),
    deleteCollege: builder.mutation({
      query: (collegeId) => ({
        url: `/colleges/${collegeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['College', 'Department', 'Programme'],
    }),
    deleteDepartment: builder.mutation({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['College', 'Department', 'Programme'],
    }),
  }),
});

export const {
  useGetCollegesQuery,
  useCreateCollegeMutation,
  useCreateDepartmentMutation,
  useUpdateCollegeMutation,
  useDeleteCollegeMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
  useGetProgrammesQuery,
  useCreateProgrammeMutation,
} = institutionApi;
