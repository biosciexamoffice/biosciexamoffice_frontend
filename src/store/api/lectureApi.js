import  {createApi} from '@reduxjs/toolkit/query/react'
import baseQuery from './baseQuery';

const lecturerApi = createApi({
    reducerPath: 'lecturerApi',
    baseQuery,
    tagTypes: ['Lecturer'],
    endpoints: (builder) => ({
        createLecturer: builder.mutation({
            query: (lecturer) =>{
                return {
                    url: '/lecturers',
                    method: 'POST',
                    body: lecturer,
                }
            },
            invalidatesTags: ['Lecturer'],
        
        }),
        
        getAllLecturers: builder.query({
            query: () =>{
                return {
                    url: '/lecturers',
                    method: 'GET',
                }
            },
            providesTags: ['Lecturer'],
        }),

        getLecturerById: builder.query({
            query: (lecturerId) =>{
                return {
                    url: `/lecturers/${lecturerId}`,
                    method: 'GET',
                }
            },
            providesTags: (result, error, lecturerId) => [{ type: 'Lecturer', id: lecturerId }],
        
        }),

        updateLecturer: builder.mutation({
            query: ({ id, ...patch }) => ({
                url: `/lecturers/${id}`,
                method: 'PATCH',
                body: patch,
            }),
            invalidatesTags: ['Lecturer'],
        
        
        }),

        deleteLecturer: builder.mutation({
            query: (lecturerId) => ({
                url: `/lecturers/${lecturerId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Lecturer'],
                
        })
        
    })
});

export const {
  useCreateLecturerMutation,
  useGetAllLecturersQuery,
  useGetLecturerByIdQuery,
  useUpdateLecturerMutation,
  useDeleteLecturerMutation,
  
} = lecturerApi;

export {lecturerApi }
