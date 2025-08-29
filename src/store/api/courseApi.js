import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const courseApi = createApi({
    reducerPath: 'courseApi',
    baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
    tagTypes: ['Course'],
    endpoints: (builder) => ({
        createCourse: builder.mutation({
            query: (course) => ({
                url: '/api/courses',
                method: 'POST',
                body: course,
            }),
            invalidatesTags: ['Course'],
        }),

        getAllCourses: builder.query({
            query: () => ({
                url: '/api/courses',
                method: 'GET',
            }),
            providesTags: ['Course'],
        }),

        getCourseById: builder.query({
            query: (courseId) => ({
                url: `/api/courses/${courseId}`,
                method: 'GET',
            }),
            providesTags: (result, error, courseId) => [{ type: 'Course', id: courseId }],
        }),

        updateCourse: builder.mutation({
            query: ({ id, ...patch }) => ({
                url: `/api/courses/${id}`,
                method: 'PATCH',
                body: patch,
            }),
            invalidatesTags: ['Course'],
        }),

        deleteCourse: builder.mutation({
            query: (courseId) => ({
                url: `/api/courses/${courseId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Course'],
        }),

        uploadCourses: builder.mutation({
            query: (formData) => ({
                url: '/api/courses/upload',
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