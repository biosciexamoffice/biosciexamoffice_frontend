import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const studentApi = createApi({
  reducerPath: 'studentApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
  tagTypes: ['Student'],
  endpoints: (builder) => ({
    createStudent: builder.mutation({
      query: (student) => ({
        url: '/api/students',
        method: 'POST',
        body: student,
      }),
      invalidatesTags: ['Student'],
    }),
    getAllStudents: builder.query({
      query: () => '/api/students',
      providesTags: ['Student'],
    }),
    updateStudent: builder.mutation({
      query: ({ id, ...student }) => ({
        url: `/api/students/${id}`,
        method: 'PATCH',
        body: student,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),
    deleteStudent: builder.mutation({
      query: ({ id }) => ({
        url: `/api/students/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Student'],
    }),
    uploadStudents: builder.mutation({
      query: (formData) => ({
        url: '/api/students/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{type:'Student', id: 'LIST'}],
    }),
  }),
});

export const {
  useCreateStudentMutation,
  useGetAllStudentsQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useUploadStudentsMutation,
} = studentApi;

export { studentApi };
