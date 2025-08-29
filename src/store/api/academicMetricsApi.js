import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';


export const academicMetricsApi = createApi({
  reducerPath: 'academicMetricsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
  tagTypes: ['AcademicMetrics', 'ComprehensiveResults'],
  endpoints: (builder) => ({
    // Get comprehensive results
    getComprehensiveResults: builder.query({
        query: ({ session, semester, level }) => ({
          url: '/api/academic-metrics/comprehensive',
          params: {  // Use params object for proper URL encoding
            session,
            semester,
            level
          }
        }),
        providesTags: ['ComprehensiveResults'],
      }),
    getMetrics: builder.query({
      query:() =>{
        url: '/api/academic-metrics/'
        method: 'GET'
      },
      providesTags: ["AcademicMetrics"]
    }),
    searchMetrics: builder.query({
    query: ({ session, semester, level, regNo }) => ({
      url: '/api/academic-metrics/search',
      params: {
        ...(session && { session }),
        ...(semester && { semester }),
        ...(level && { level }),
        ...(regNo && { regNo })
      }
    }),
    providesTags: ['AcademicMetrics']
  }),
   // Delete metrics
    deleteMetrics: builder.mutation({
      query: (metricsId) => ({
        url: `/api/academic-metrics/${metricsId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['AcademicMetrics', 'ComprehensiveResults']
    }),
     // Update metrics
     updateMetrics: builder.mutation({
        query: ({ metricsId, ...updateData }) => ({
          url: `/api/academic-metrics/${metricsId}`,
          method: 'PUT',
          body: updateData
        }),
        invalidatesTags: ['AcademicMetrics', 'ComprehensiveResults']
      })
  })
 

});

export const {
  useGetComprehensiveResultsQuery,
  useLazyGetComprehensiveResultsQuery,
  useGetMetricsQuery,
  useDeleteMetricsMutation,
  useSearchMetricsQuery,
  useLazySearchMetricsQuery,
  useUpdateMetricsMutation
} = academicMetricsApi;