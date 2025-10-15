import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const approvalApi = createApi({
  reducerPath: 'approvalApi',
  baseQuery,
  tagTypes: ['Approval'],
  endpoints: (builder) => ({
    getPendingApprovals: builder.query({
      query: ({ role, session, semester, level }) => ({
        url: '/approvals/pending',
        params: {
          role,
          session,
          semester,
          level,
        },
      }),
      providesTags: (result, error, arg) => [{ type: 'Approval', role: arg.role }],
    }),
  }),
});

export const {
  useGetPendingApprovalsQuery,
} = approvalApi;
