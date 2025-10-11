import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const courseRegistrationApi = createApi({
  reducerPath: 'courseRegistrationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:10000/api',
    prepareHeaders: (headers) => {
      // const token = getState().auth.token;
      // if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    // POST: upload multiple CSVs
    uploadCourseRegistrations: builder.mutation({
      query: (data) => {
        const { session, semester, curriculumType, files } = data;
        const formData = new FormData();
        formData.append('session', session);
        formData.append('semester', semester);
        if (curriculumType) formData.append('curriculumType', curriculumType);
        files.forEach((file) => formData.append('files', file));

        return {
          url: '/course-registration/registrations/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),

    // GET: search regNos by course/session/semester/level
    searchCourseRegistrations: builder.query({
      query: ({ session, semester, level, course, page = 1, limit = 1000 }) => ({
        url: '/course-registration/registrations/search',
        params: { session, semester, level, course, page, limit },
      }),
    }),
    listRegistrationCourses: builder.query({
      query: ({ session, semester, level, q = '', page = 1, limit = 20 }) => ({
        url: '/course-registration/registrations/courses',
        params: { session, semester, level, q, page, limit },
      }),
    }),

    getRegistrationStudents: builder.query({
      query: ({ session, semester, level, course, regNo = '', page = 1, limit = 50 }) => ({
        url: '/course-registration/registrations/students',
        params: { session, semester, level, course, regNo, page, limit },
      }),
    }),

    moveRegisteredStudents: builder.mutation({
      query: ({ session, semester, level, fromCourse, toCourse, regNos }) => ({
        url: '/course-registration/registrations/move',
        method: 'POST',
        body: { session, semester, level, fromCourse, toCourse, regNos },
      }),
    }),

    deleteRegisteredStudent: builder.mutation({
      query: ({ session, semester, level, course, regNo }) => ({
        url: '/course-registration/registrations/student',
        method: 'DELETE',
        body: { session, semester, level, course, regNo },
      }),
    }),
  }),
});

export const {
  useUploadCourseRegistrationsMutation,
  useSearchCourseRegistrationsQuery,
  useLazySearchCourseRegistrationsQuery,
  useListRegistrationCoursesQuery,
  useLazyListRegistrationCoursesQuery,
  useGetRegistrationStudentsQuery,
  useLazyGetRegistrationStudentsQuery,
  useDeleteRegisteredStudentMutation,
   useMoveRegisteredStudentsMutation,// handy for on-demand searches (e.g., button click)
} = courseRegistrationApi;
