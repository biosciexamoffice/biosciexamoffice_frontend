import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const approvedCoursesApi = createApi({
    reducerPath: 'approvedCoursesApi',
    baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
    tagTypes: ['ApprovedCourses'],
    endpoints: (builder) => ({
        // Create approved courses
        createApprovedCourses: builder.mutation({
            query: (approvedCoursesData) => ({
                url: '/api/approvedCourses',
                method: 'POST',
                body: approvedCoursesData,
            }),
            invalidatesTags: ['ApprovedCourses'],
        }),

        // Get all approved courses (with optional query params)
        getAllApprovedCourses: builder.query({
            query: ({ college, session, semester, level } = {}) => ({
                url: '/api/approvedCourses',
                method: 'GET',
                params: { college, session, semester, level },
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ _id }) => ({ type: 'ApprovedCourses', id: _id })),
                        { type: 'ApprovedCourses', id: 'LIST' },
                    ]
                    : [{ type: 'ApprovedCourses', id: 'LIST' }],
        }),

        // Get approved courses by ID
        getApprovedCoursesById: builder.query({
            query: (id) => ({
                url: `/api/approvedCourses/${id}`,
                method: 'GET',
            }),
            providesTags: (result, error, id) => [{ type: 'ApprovedCourses', id }],
        }),

        // Update approved courses
        updateApprovedCourses: builder.mutation({
            query: ({ id, ...patch }) => ({
                url: `/api/approvedCourses/${id}`,
                method: 'PUT',
                body: patch,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'ApprovedCourses', id }],
        }),

        // Delete approved courses
        deleteApprovedCourses: builder.mutation({
            query: (id) => ({
                url: `/api/approvedCourses/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'ApprovedCourses', id }],
        }),

        // Additional endpoint if you need to get courses by specific criteria
        getApprovedCoursesByCriteria: builder.query({
            query: ({ college, session, semester, level }) => ({
                url: '/api/approvedCourses',
                method: 'GET',
                params: { college, session, semester, level },
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ _id }) => ({ type: 'ApprovedCourses', id: _id })),
                        { type: 'ApprovedCourses', id: 'LIST' },
                    ]
                    : [{ type: 'ApprovedCourses', id: 'LIST' }],
        }),
    }),
});

export const {
    useCreateApprovedCoursesMutation,
    useGetAllApprovedCoursesQuery,
    useGetApprovedCoursesByIdQuery,
    useUpdateApprovedCoursesMutation,
    useDeleteApprovedCoursesMutation,
    useGetApprovedCoursesByCriteriaQuery,
} = approvedCoursesApi;

export { approvedCoursesApi };