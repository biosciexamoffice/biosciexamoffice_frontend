import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const approvalApi = createApi({
  reducerPath: 'approvalApi',
  baseQuery,
  tagTypes: ['Approval'],
  endpoints: (builder) => ({
    getPendingApprovals: builder.query({
      query: ({ role, session, semester, level, limit }) => ({
        url: '/approvals/pending',
        params: {
          role,
          session,
          semester,
          level,
          limit,
        },
      }),
      providesTags: (result, error, arg) => [{ type: 'Approval', role: `${arg.role}-${arg.limit}` }],
    }),
    getProcessedApprovals: builder.query({
      query: ({ role, status, session, semester, level, limit }) => ({
        url: '/approvals/processed',
        params: {
          role,
          status,
          session,
          semester,
          level,
          limit,
        },
      }),
      providesTags: (result, error, arg) => [
        {
          type: 'Approval',
          role: `${arg.role}-${arg.status || 'approved'}-${arg.limit || 'default'}`,
        },
      ],
    }),
  }),
});

export const {
  useGetPendingApprovalsQuery,
  useGetProcessedApprovalsQuery,
} = approvalApi;
