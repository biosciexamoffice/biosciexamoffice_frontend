import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

const studentApi = createApi({
  reducerPath: 'studentApi',
  baseQuery,
  tagTypes: ['Student'],
  endpoints: (builder) => ({
    createStudent: builder.mutation({
      query: (student) => ({
        url: '/students',
        method: 'POST',
        body: student,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    getAllStudents: builder.query({
      query: () => '/students',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Student', id: _id })),
              { type: 'Student', id: 'LIST' },
            ]
          : [{ type: 'Student', id: 'LIST' }],
    }),
    getStudentById: builder.query({
      query: (id) => `/students/${id}`,
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),
    updateStudent: builder.mutation({
      query: ({ id, ...student }) => ({
        url: `/students/${id}`,
        method: 'PATCH',
        body: student,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    updateStudentPassport: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/students/${id}/passport`,
        method: 'PATCH',
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    deleteStudentPassport: builder.mutation({
      query: ({ id }) => ({
        url: `/students/${id}/passport`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    deleteStudent: builder.mutation({
      query: ({ id }) => ({
        url: `/students/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    uploadStudents: builder.mutation({
      query: (formData) => ({
        url: '/students/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    searchStudentByRegNo: builder.query({
      query: (regNo) => ({
        url: '/students/search',
        params: { regNo },
      }),
      providesTags: (result) =>
        result ? [{ type: 'Student', id: result._id }] : [],
    }),
    updateStudentStanding: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/students/${id}/standing`,
        method: 'PATCH',
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    getStandingRecords: builder.query({
      query: (params = {}) => ({
        url: '/students/standing-records',
        params,
      }),
      providesTags: (result) =>
        result?.records
          ? [
              ...result.records
                .filter((record) => record.student?._id)
                .map((record) => ({ type: 'Student', id: record.student._id })),
              { type: 'Student', id: 'STANDING_RECORDS' },
            ]
          : [{ type: 'Student', id: 'STANDING_RECORDS' }],
    }),
  }),
});

export const {
  useCreateStudentMutation,
  useGetAllStudentsQuery,
  useGetStudentByIdQuery,
  useLazyGetStudentByIdQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useUploadStudentsMutation,
  useSearchStudentByRegNoQuery,
  useLazySearchStudentByRegNoQuery,
  useUpdateStudentStandingMutation,
  useUpdateStudentPassportMutation,
  useDeleteStudentPassportMutation,
  useGetStandingRecordsQuery,
} = studentApi;

export { studentApi };
