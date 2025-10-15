import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

const approvedCoursesApi = createApi({
    reducerPath: 'approvedCoursesApi',
    baseQuery,
    tagTypes: ['ApprovedCourses'],
    endpoints: (builder) => ({
        // Create approved courses
        createApprovedCourses: builder.mutation({
            query: (approvedCoursesData) => ({
                url: '/approvedCourses',
                method: 'POST',
                body: approvedCoursesData,
            }),
            invalidatesTags: ['ApprovedCourses'],
        }),

        // Get all approved courses (with optional query params)
        getAllApprovedCourses: builder.query({
            query: ({ collegeId, departmentId, programmeId, session, semester, level } = {}) => ({
                url: '/approvedCourses',
                method: 'GET',
                params: {
                    ...(collegeId ? { collegeId } : {}),
                    ...(departmentId ? { departmentId } : {}),
                    ...(programmeId ? { programmeId } : {}),
                    ...(session ? { session } : {}),
                    ...(semester != null ? { semester } : {}),
                    ...(level != null ? { level } : {}),
                },
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
                url: `/approvedCourses/${id}`,
                method: 'GET',
            }),
            providesTags: (result, error, id) => [{ type: 'ApprovedCourses', id }],
        }),

        // Update approved courses
        updateApprovedCourses: builder.mutation({
            query: ({ id, ...patch }) => ({
                url: `/approvedCourses/${id}`,
                method: 'PUT',
                body: patch,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'ApprovedCourses', id }],
        }),

        // Delete approved courses
        deleteApprovedCourses: builder.mutation({
            query: (id) => ({
                url: `/approvedCourses/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'ApprovedCourses', id }],
        }),

        // Additional endpoint if you need to get courses by specific criteria
        getApprovedCoursesByCriteria: builder.query({
            query: ({ collegeId, departmentId, programmeId, session, semester, level }) => ({
                url: '/approvedCourses',
                method: 'GET',
                params: {
                    ...(collegeId ? { collegeId } : {}),
                    ...(departmentId ? { departmentId } : {}),
                    ...(programmeId ? { programmeId } : {}),
                    ...(session ? { session } : {}),
                    ...(semester != null ? { semester } : {}),
                    ...(level != null ? { level } : {}),
                },
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
