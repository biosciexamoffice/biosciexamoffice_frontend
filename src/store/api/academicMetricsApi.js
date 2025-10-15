// store/api/academicMetricsApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const academicMetricsApi = createApi({
  reducerPath: 'academicMetricsApi',
  baseQuery,
  tagTypes: ['AcademicMetrics', 'ComprehensiveResults'],
  endpoints: (builder) => ({
    getComprehensiveResults: builder.query({
      query: ({ session, semester, level, studentIds, studentRegNos, onlyStudents }) => ({
        url: '/academic-metrics/comprehensive',
        params: {
          session,
          semester,
          level,
          ...(Array.isArray(studentIds) && studentIds.length
            ? { studentIds: studentIds.join(',') }
            : {}),
          ...(Array.isArray(studentRegNos) && studentRegNos.length
            ? { studentRegNos: studentRegNos.join(',') }
            : {}),
          ...(onlyStudents ? { onlyStudents: true } : {}),
        },
      }),
      providesTags: ['ComprehensiveResults'],
    }),

    computeStudentMetrics: builder.query({
      query: ({ session, semester, level, regNo }) => ({
        url: '/academic-metrics/compute-student',
        params: { session, semester, level, regNo },
      }),
      providesTags: (_r, _e, args) => [
        { type: 'AcademicMetrics', id: `STU-${args?.regNo || 'NA'}` },
      ],
    }),

    getMetrics: builder.query({
      query: () => ({ url: '/academic-metrics/', method: 'GET' }),
      providesTags: ['AcademicMetrics'],
    }),

    searchMetrics: builder.query({
      query: ({ session, semester, level, regNo }) => ({
        url: '/academic-metrics/search',
        params: {
          ...(session && { session }),
          ...(semester && { semester }),
          ...(level && { level }),
          ...(regNo && { regNo }),
        },
      }),
      providesTags: ['AcademicMetrics'],
    }),

    deleteMetrics: builder.mutation({
      query: (metricsId) => ({
        url: `/academic-metrics/${metricsId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AcademicMetrics', 'ComprehensiveResults'],
    }),

    recomputeAcademicMetrics: builder.mutation({
      query: ({ session, semester, level, studentIds, studentRegNos }) => ({
        url: '/academic-metrics/recompute',
        method: 'POST',
        body: {
          session,
          semester,
          level,
          ...(Array.isArray(studentIds) && studentIds.length ? { studentIds } : {}),
          ...(Array.isArray(studentRegNos) && studentRegNos.length ? { studentRegNos } : {}),
        },
      }),
      invalidatesTags: ['AcademicMetrics', 'ComprehensiveResults'],
    }),

    updateMetrics: builder.mutation({
      query: ({ metricsId, ...updateData }) => ({
        url: `/academic-metrics/${metricsId}`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: ['AcademicMetrics', 'ComprehensiveResults'],
    }),
    uploadOldMetrics: builder.mutation({
  query: ({ body, onUploadProgress }) => ({
    url: '/academic-metrics/upload-old',
    method: 'POST',
    body,
    onUploadProgress: (evt) => {
      if (onUploadProgress && evt.total) onUploadProgress(evt);
    },
    headers: {}, // let browser set multipart boundary
  }),
  invalidatesTags: ['AcademicMetrics', 'ComprehensiveResults'],
}),

  }),
});

export const {
  useGetComprehensiveResultsQuery,
  useLazyGetComprehensiveResultsQuery,
  useComputeStudentMetricsQuery,
  useLazyComputeStudentMetricsQuery,
  useGetMetricsQuery,
  useDeleteMetricsMutation,
  useSearchMetricsQuery,
  useLazySearchMetricsQuery,
  useUpdateMetricsMutation,
  useRecomputeAcademicMetricsMutation,
  useUploadOldMetricsMutation,
} = academicMetricsApi;
