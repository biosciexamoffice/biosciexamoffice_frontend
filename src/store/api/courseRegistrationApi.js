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
        const { session, semester, level, files } = data;
        const formData = new FormData();
        formData.append('session', session);
        formData.append('level', level);
        formData.append('semester', semester);
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
  }),
});

export const {
  useUploadCourseRegistrationsMutation,
  useSearchCourseRegistrationsQuery,
  useLazySearchCourseRegistrationsQuery, // handy for on-demand searches (e.g., button click)
} = courseRegistrationApi;
