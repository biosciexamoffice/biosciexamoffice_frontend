import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

const resultApi = createApi({
  reducerPath: 'resultApi',
  baseQuery,
  tagTypes: ['Result', 'ResultExport'],
  endpoints: (builder) => ({
    createResult: builder.mutation({
      query: (result) => ({
        url: '/results',
        method: 'POST',
        body: result,
      }),
      invalidatesTags: ['Result'],
    }),

    getAllResults: builder.query({
      query: (params) => {
        const { regNo, courseCode, session, semester, level, name, q, course, resultType, limit, page } = params || {};
        const queryParams = new URLSearchParams();
        if (regNo) queryParams.append('regNo', regNo);
        if (courseCode) queryParams.append('courseCode', courseCode);
        if (session) queryParams.append('session', session);
        if (semester) queryParams.append('semester', semester);
        if (level) queryParams.append('level', level);
        if (name) queryParams.append('name', name);
        if (q) queryParams.append('q', q);
        if (course) queryParams.append('course', course);
        if (resultType) queryParams.append('resultType', resultType);
        if (limit !== undefined && limit !== null) queryParams.append('limit', String(limit));
        if (page !== undefined && page !== null) queryParams.append('page', String(page));
        return {
          url: `/results?${queryParams.toString()}`,
        };
      },
      providesTags: (result) => result ? [...result.map(({ id }) => ({ type: 'Result', id })), { type: 'Result', id: 'LIST' }] : [{ type: 'Result', id: 'LIST' }],
    }),

    getResultById: builder.query({
      query: (resultId) => ({
        url: `/results/${resultId}`,
        method: 'GET',
      }),
      providesTags: (result, error, resultId) => [{ type: 'Result', id: resultId }],
    }),

    updateResult: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/results/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Result', id }, { type: 'Result', id: 'LIST' }],
    }),

    deleteResult: builder.mutation({
      query: (resultId) => ({
        url: `/results/${resultId}`,
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
      url: `/results/course/${id}?${queryParams.toString()}`,
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
    url: '/results/upload-results',
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
      query: (studentId) => `/results?student=${studentId}`, // Assuming a query parameter for filtering
      providesTags: (result, error, studentId) => [{ type: 'Result', id: `LIST-STUDENT-${studentId}` }],
    }),

    getResultsByCourse: builder.query({
      query: (params) => {
        const { courseId, session, semester, level, limit, page } = typeof params === 'object' ? params : { courseId: params };
        if (!courseId) {
          throw new Error('courseId is required');
        }
        const qp = new URLSearchParams();
        qp.append('course', courseId);
        if (session) qp.append('session', session);
        if (semester) qp.append('semester', String(semester));
        if (level) qp.append('level', level);
        if (limit !== undefined && limit !== null) qp.append('limit', String(limit));
        if (page !== undefined && page !== null) qp.append('page', String(page));
        return `/results?${qp.toString()}`;
      },
      providesTags: (result, error, params) => {
        const courseId = typeof params === 'object' ? params?.courseId : params;
        return [{ type: 'Result', id: `LIST-COURSE-${courseId}` }];
      },
    }),

    getResultsSummary: builder.query({
      query: (params) => {
        const { session, semester, level } = params || {};
        const qp = new URLSearchParams();
        if (session) qp.append('session', session);
        if (semester) qp.append('semester', String(semester));
        if (level) qp.append('level', level);
        const queryString = qp.toString();
        return {
          url: queryString ? `/results/summary?${queryString}` : '/results/summary',
        };
      },
      transformResponse: (response) => response || { success: false, items: [], totalResults: 0, totalCourses: 0, avgPerCourse: 0 },
      providesTags: [{ type: 'Result', id: 'SUMMARY' }],
    }),

    deleteMultipleResults: builder.mutation({
        query: (ids) => ({
          url: '/results/bulk',
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
    return { url: `/results-export?${qp.toString()}` };
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
  return { url: `/results-export/health?${qp.toString()}` };
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
  useLazyGetResultsByCourseQuery,
  useGetResultsSummaryQuery,
  useDeleteAllResultsForCourseMutation,
  useUploadResultsMutation,
  useDeleteMultipleResultsMutation,

  useListResultsExportQuery,
  useLazyListResultsExportQuery,
  useGetResultsExportHealthQuery,
  useLazyGetResultsExportHealthQuery,
} = resultApi;

export { resultApi };
