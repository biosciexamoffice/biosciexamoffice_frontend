import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const courseRegistrationApi = createApi({
  reducerPath: 'courseRegistrationApi',
  baseQuery,
  endpoints: (builder) => ({
    // POST: upload multiple CSVs
    uploadCourseRegistrations: builder.mutation({
      query: (data) => {
        const { session, semester, curriculumType, files, collegeId, departmentId, programmeId } = data;
        const formData = new FormData();
        formData.append('session', session);
        formData.append('semester', semester);
        if (curriculumType) formData.append('curriculumType', curriculumType);
        if (collegeId) formData.append('collegeId', collegeId);
        if (departmentId) formData.append('departmentId', departmentId);
        if (programmeId) formData.append('programmeId', programmeId);
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

    deleteCourseRegistrations: builder.mutation({
      query: ({ session, semester, level, course }) => ({
        url: '/course-registration/registrations/course',
        method: 'DELETE',
        body: { session, semester, level, course },
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
  useMoveRegisteredStudentsMutation,
  useDeleteCourseRegistrationsMutation,
} = courseRegistrationApi;
