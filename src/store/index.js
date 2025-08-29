import { configureStore } from "@reduxjs/toolkit";

import { lecturerApi } from "./api/lectureApi";
import { courseApi } from "./api/courseApi";
import { studentApi } from "./api/studentApi";
import { resultApi } from "./api/resultApi";
import { academicMetricsApi } from './api/academicMetricsApi';
import { sessionApi } from "./api/sessionApi";
import {approvedCoursesApi} from "./api/approvedCoursesApi"
import { graduationApi } from "./api/graduationApi"
import { courseRegistrationApi } from "./api/courseRegistrationApi";
 
const store = configureStore({
    reducer:{
        [lecturerApi.reducerPath]: lecturerApi.reducer,
        [courseApi.reducerPath]: courseApi.reducer,
        [studentApi.reducerPath]: studentApi.reducer,
        [resultApi.reducerPath]: resultApi.reducer,
        [academicMetricsApi.reducerPath]: academicMetricsApi.reducer,
        [approvedCoursesApi.reducerPath] : approvedCoursesApi.reducer,
        [sessionApi.reducerPath]: sessionApi.reducer,
        [graduationApi.reducerPath]: graduationApi.reducer,
        [courseRegistrationApi.reducerPath]: courseRegistrationApi.reducer
    
    },

    middleware: (getDefaultMiddleWare) => {
        return getDefaultMiddleWare()
            .concat(lecturerApi.middleware)
            .concat(courseApi.middleware)
            .concat(studentApi.middleware)
            .concat(resultApi.middleware)
            .concat(academicMetricsApi.middleware)
            .concat(approvedCoursesApi.middleware)
            .concat(sessionApi.middleware)
            .concat(graduationApi.middleware)
            .concat(courseRegistrationApi.middleware)
    }
})

export {store}

export {
  useCreateLecturerMutation,
  useGetAllLecturersQuery,
  useGetLecturerByIdQuery,
  useUpdateLecturerMutation,
  useDeleteLecturerMutation,
} from './api/lectureApi'

export {
  useCreateCourseMutation,
  useGetAllCoursesQuery,
  useGetCourseByIdQuery,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useUploadCoursesMutation,
} from './api/courseApi'

export {
  useCreateStudentMutation,
  useGetAllStudentsQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useUploadStudentsMutation,
} from './api/studentApi'

export {
  useCreateResultMutation,
  useGetAllResultsQuery,
  useLazyGetAllResultsQuery,
  useGetResultByIdQuery,
  useUpdateResultMutation,
  useDeleteResultMutation,
  useDeleteAllResultsForCourseMutation,
  useGetResultsByStudentQuery,
  useGetResultsByCourseQuery,
  useUploadResultsMutation,
  useDeleteMultipleResultsMutation,

  useListResultsExportQuery,
  useLazyListResultsExportQuery,
  useGetResultsExportHealthQuery,
  useLazyGetResultsExportHealthQuery,
} from './api/resultApi'

export  {
  
  useGetComprehensiveResultsQuery,
  useLazyGetComprehensiveResultsQuery,
  useGetMetricsQuery,
  useDeleteMetricsMutation,
  useSearchMetricsQuery,
  useLazySearchMetricsQuery,
  useUpdateMetricsMutation
} from './api/academicMetricsApi'


export {
  useCreateApprovedCoursesMutation,
    useGetAllApprovedCoursesQuery,
    useGetApprovedCoursesByIdQuery,
    useUpdateApprovedCoursesMutation,
    useDeleteApprovedCoursesMutation,
    useGetApprovedCoursesByCriteriaQuery
  } from './api/approvedCoursesApi'

export {
    useCreateSessionMutation,
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useGetCurrentSessionQuery
} from './api/sessionApi'

export {
useGetGraduationAvailabilityQuery,
  useGetGraduatingListQuery,
  useFinalizeGraduationMutation,
} from './api/graduationApi'


export {
  useUploadCourseRegistrationsMutation,
  useSearchCourseRegistrationsQuery,
  useLazySearchCourseRegistrationsQuery
} from './api/courseRegistrationApi'