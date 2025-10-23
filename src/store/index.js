import { configureStore } from "@reduxjs/toolkit";

import { collegeApi } from "./api/collegeApi";
import { lecturerApi } from "./api/lectureApi";
import { courseApi } from "./api/courseApi";
import { studentApi } from "./api/studentApi";
import { resultApi } from "./api/resultApi";
import { academicMetricsApi } from './api/academicMetricsApi';
import { sessionApi } from "./api/sessionApi";
import {approvedCoursesApi} from "./api/approvedCoursesApi"
import { graduationApi } from "./api/graduationApi"
import { courseRegistrationApi } from "./api/courseRegistrationApi";
import { registrationFormsApi } from "./api/registrationFormsApi";
import { authApi } from "./api/authApi";
import { approvalApi } from "./api/approvalApi";
import { institutionApi } from "./api/institutionApi";
import { syncApi } from "./api/syncApi";
import authReducer from "./features/authSlice";
import envReducer from "./features/envSlice";
 
const store = configureStore({
    reducer:{
        auth: authReducer,
        env: envReducer,
        [collegeApi.reducerPath]: collegeApi.reducer,
        [lecturerApi.reducerPath]: lecturerApi.reducer,
        [courseApi.reducerPath]: courseApi.reducer,
        [studentApi.reducerPath]: studentApi.reducer,
        [resultApi.reducerPath]: resultApi.reducer,
        [academicMetricsApi.reducerPath]: academicMetricsApi.reducer,
        [approvedCoursesApi.reducerPath] : approvedCoursesApi.reducer,
        [sessionApi.reducerPath]: sessionApi.reducer,
        [graduationApi.reducerPath]: graduationApi.reducer,
        [courseRegistrationApi.reducerPath]: courseRegistrationApi.reducer,
        [registrationFormsApi.reducerPath]: registrationFormsApi.reducer,
        [authApi.reducerPath]: authApi.reducer,
        [approvalApi.reducerPath]: approvalApi.reducer,
        [institutionApi.reducerPath]: institutionApi.reducer,
        [syncApi.reducerPath]: syncApi.reducer,
    
    },

    middleware: (getDefaultMiddleWare) => {
        return getDefaultMiddleWare()
            .concat(collegeApi.middleware)
            .concat(lecturerApi.middleware)
            .concat(courseApi.middleware)
            .concat(studentApi.middleware)
            .concat(resultApi.middleware)
            .concat(academicMetricsApi.middleware)
            .concat(approvedCoursesApi.middleware)
            .concat(sessionApi.middleware)
            .concat(graduationApi.middleware)
            .concat(courseRegistrationApi.middleware)
            .concat(registrationFormsApi.middleware)
            .concat(authApi.middleware)
            .concat(approvalApi.middleware)
            .concat(institutionApi.middleware)
            .concat(syncApi.middleware)
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
  useGetStudentByIdQuery,
  useLazyGetStudentByIdQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useUploadStudentsMutation,
  useSearchStudentByRegNoQuery,
  useLazySearchStudentByRegNoQuery,
  useUpdateStudentStandingMutation,
  useUpdateStudentPassportMutation,
  useDeleteStudentPassportMutation,
  useGetStandingRecordsQuery,
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
  useLazyGetResultsByCourseQuery,
  useGetResultsSummaryQuery,
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

  useComputeStudentMetricsQuery,          // if you need non-lazy
  useLazyComputeStudentMetricsQuery,      // ✅ use this in UI

  useGetMetricsQuery,
  useDeleteMetricsMutation,
  useSearchMetricsQuery,
  useLazySearchMetricsQuery,
  useUpdateMetricsMutation,
  useRecomputeAcademicMetricsMutation,
  useAnalyzeOldMetricsMutation,
   useUploadOldMetricsMutation,
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
  useCloseSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
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
  useLazySearchCourseRegistrationsQuery,
  useListRegistrationCoursesQuery,
  useLazyListRegistrationCoursesQuery,
  useGetRegistrationStudentsQuery,
  useLazyGetRegistrationStudentsQuery,
  useDeleteRegisteredStudentMutation,
  useMoveRegisteredStudentsMutation,
  useDeleteCourseRegistrationsMutation,
} from './api/courseRegistrationApi'

export {
  // ...existing exports
  useGenerateRegistrationDataMutation,
} from "./api/registrationFormsApi";

export {
  useLoginMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from './api/authApi';

export {
  useGetPendingApprovalsQuery,
  useGetProcessedApprovalsQuery,
} from './api/approvalApi';

export {
  useTriggerSyncPullMutation,
  useTriggerSyncPushMutation,
} from './api/syncApi';

export {
  useGetCollegesQuery,
  useCreateCollegeMutation,
  useUpdateCollegeMutation,
  useDeleteCollegeMutation,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
  useGetProgrammesQuery,
  useCreateProgrammeMutation,
} from './api/institutionApi';

export {
  selectCurrentUser,
  selectCurrentRoles,
  selectCurrentToken,
  logout,
  setCredentials,
} from './features/authSlice';

export {
  fetchEnvironment,
  selectEnvMode,
  selectEnvStatus,
  selectEnvError,
  selectIsReadOnly,
} from './features/envSlice';
