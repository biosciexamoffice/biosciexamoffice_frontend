import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

const courseApi = createApi({
    reducerPath: 'courseApi',
    baseQuery,
    tagTypes: ['Course'],
    endpoints: (builder) => ({
        createCourse: builder.mutation({
            query: (course) => ({
                url: '/courses',
                method: 'POST',
                body: course,
            }),
            invalidatesTags: ['Course'],
        }),

        getAllCourses: builder.query({
            query: () => ({
                url: '/courses',
                method: 'GET',
            }),
            providesTags: ['Course'],
        }),

        getCourseById: builder.query({
            query: (courseId) => ({
                url: `/courses/${courseId}`,
                method: 'GET',
            }),
            providesTags: (result, error, courseId) => [{ type: 'Course', id: courseId }],
        }),

        updateCourse: builder.mutation({
            query: ({ id, ...patch }) => ({
                url: `/courses/${id}`,
                method: 'PATCH',
                body: patch,
            }),
            invalidatesTags: ['Course'],
        }),

        deleteCourse: builder.mutation({
            query: (courseId) => ({
                url: `/courses/${courseId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Course'],
        }),

        uploadCourses: builder.mutation({
            query: (formData) => ({
                url: '/courses/upload',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: [{type: 'Course', id: 'LIST'}],
        }),
    }),
});

export const {
    useCreateCourseMutation,
    useGetAllCoursesQuery,
    useGetCourseByIdQuery,
    useUpdateCourseMutation,
    useDeleteCourseMutation,
    useUploadCoursesMutation,
} = courseApi;

export { courseApi };
