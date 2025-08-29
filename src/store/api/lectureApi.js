import  {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react'

const lecturerApi = createApi({
    reducerPath: 'lecturerApi',
    baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:10000' }),
    tagTypes: ['Lecturer'],
    endpoints: (builder) => ({
        createLecturer: builder.mutation({
            query: (lecturer) =>{
                return {
                    url: '/api/lecturers',
                    method: 'POST',
                    body: lecturer,
                }
            },
            invalidatesTags: ['Lecturer'],
        
        }),
        
        getAllLecturers: builder.query({
            query: () =>{
                return {
                    url: '/api/lecturers',
                    method: 'GET',
                }
            },
            providesTags: ['Lecturer'],
        }),

        getLecturerById: builder.query({
            query: (lecturerId) =>{
                return {
                    url: `/api/lecturers/${lecturerId}`,
                    method: 'GET',
                }
            },
            providesTags: (result, error, lecturerId) => [{ type: 'Lecturer', id: lecturerId }],
        
        }),

        updateLecturer: builder.mutation({
            query: ({ id, ...patch }) => ({
                url: `/api/lecturers/${id}`,
                method: 'PATCH',
                body: patch,
            }),
            invalidatesTags: ['Lecturer'],
        
        
        }),

        deleteLecturer: builder.mutation({
            query: (lecturerId) => ({
                url: `/api/lecturers/{${lecturerId}}`,
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
