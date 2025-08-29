import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const resultApi = createApi({
  reducerPath: 'resultApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
  credentials: 'include',
  tagTypes: ['Result', 'ResultExport'],
  endpoints: (builder) => ({
    createResult: builder.mutation({
      query: (result) => ({
        url: '/api/results',
        method: 'POST',
        body: result,
      }),
      invalidatesTags: ['Result'],
    }),

    getAllResults: builder.query({
      query: (params) => {
        const { regNo, courseCode, session, semester, level, name, q } = params || {};
        const queryParams = new URLSearchParams();
        if (regNo) queryParams.append('regNo', regNo);
        if (courseCode) queryParams.append('courseCode', courseCode);
        if (session) queryParams.append('session', session);
        if (semester) queryParams.append('semester', semester);
        if (level) queryParams.append('level', level);
        if (name) queryParams.append('name', name);
        if (q) queryParams.append('q', q);
        return {
          url: `/api/results?${queryParams.toString()}`,
        };
      },
      providesTags: (result) => result ? [...result.map(({ id }) => ({ type: 'Result', id })), { type: 'Result', id: 'LIST' }] : [{ type: 'Result', id: 'LIST' }],
    }),

    getResultById: builder.query({
      query: (resultId) => ({
        url: `/api/results/${resultId}`,
        method: 'GET',
      }),
      providesTags: (result, error, resultId) => [{ type: 'Result', id: resultId }],
    }),

    updateResult: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/results/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Result', id }, { type: 'Result', id: 'LIST' }],
    }),

    deleteResult: builder.mutation({
      query: (resultId) => ({
        url: `/api/results/${resultId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, resultId) => [{ type: 'Result', id: resultId }, { type: 'Result', id: 'LIST' }],
    }),

   deleteAllResultsForCourse: builder.mutation({
  query: ({ id, level, session, semester }) => {
    const queryParams = new URLSearchParams();
    if (level) queryParams.append('level', level);
    if (session) queryParams.append('session', session);
    if (semester) queryParams.append('semester', semester);
    
    return {
      url: `/api/results/course/${id}?${queryParams.toString()}`,
      method: 'DELETE',
    };
  },
  invalidatesTags: (result, error, { id }) => [
    { type: 'Result', id: 'LIST' },
    { type: 'Result', id: `LIST-COURSE-${id}` }
  ],
}),

    uploadResults: builder.mutation({
  query: ({ body, onUploadProgress }) => ({
    url: '/api/results/upload-results',
    method: 'POST',
    body,
    // Add these options to support progress tracking
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        onUploadProgress(progressEvent);
      }
    },
    // Ensure proper headers for file upload
    headers: {
      // Don't set Content-Type - let the browser set it automatically
      // with the proper boundary for multipart/form-data
    },
  }),
  invalidatesTags: [{ type: 'Result', id: 'LIST' }],
}),
    // Additional endpoints for related data (optional, adjust as needed)
    getResultsByStudent: builder.query({
      query: (studentId) => `/api/results?student=${studentId}`, // Assuming a query parameter for filtering
      providesTags: (result, error, studentId) => [{ type: 'Result', id: `LIST-STUDENT-${studentId}` }],
    }),

    getResultsByCourse: builder.query({
      query: (courseId) => `/api/results?course=${courseId}`,
      providesTags: (result, error, courseId) => [{ type: 'Result', id: `LIST-COURSE-${courseId}` }],
    }),

    deleteMultipleResults: builder.mutation({
        query: (ids) => ({
          url: '/api/results/bulk',
          method: 'DELETE',
          body: { ids },
        }),
        invalidatesTags: [{ type: 'Result', id: 'LIST' }],
    }),
    
     listResultsExport: builder.query({
  query: (params) => {
    const { regNo, courseCode, session, semester, level, resultType } = params || {};
    const qp = new URLSearchParams();
    if (regNo) qp.append('regNo', regNo);
    if (courseCode) qp.append('courseCode', courseCode);
    if (session) qp.append('session', session);
    if (semester) qp.append('semester', String(semester));
    if (level) qp.append('level', level);
    if (resultType) qp.append('resultType', resultType);
    return { url: `/api/results-export?${qp.toString()}` };
  },
  providesTags: [{ type: 'ResultExport', id: 'LIST' }],
}),

getResultsExportHealth: builder.query({
  query: (params) => {
    const { regNo, courseCode, session, semester, level, resultType } = params || {};
    const qp = new URLSearchParams();
    if (regNo) qp.append('regNo', regNo);
    if (courseCode) qp.append('courseCode', courseCode);
    if (session) qp.append('session', session);
    if (semester) qp.append('semester', String(semester));
    if (level) qp.append('level', level);
    if (resultType) qp.append('resultType', resultType);
    return { url: `/api/results-export/health?${qp.toString()}` };
  },
  providesTags: [{ type: 'ResultExport', id: 'HEALTH' }],
}),

  }),
});

export const {
  useCreateResultMutation,
  useGetAllResultsQuery,
  useLazyGetAllResultsQuery,
  useGetResultByIdQuery,
  useUpdateResultMutation,
  useDeleteResultMutation,
  useGetResultsByStudentQuery,
  useGetResultsByCourseQuery,
  useDeleteAllResultsForCourseMutation,
  useUploadResultsMutation,
  useDeleteMultipleResultsMutation,

  useListResultsExportQuery,
  useLazyListResultsExportQuery,
  useGetResultsExportHealthQuery,
  useLazyGetResultsExportHealthQuery,
} = resultApi;

export { resultApi };