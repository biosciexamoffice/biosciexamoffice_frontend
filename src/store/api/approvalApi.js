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
  }),
});

export const {
  useGetPendingApprovalsQuery,
} = approvalApi;
