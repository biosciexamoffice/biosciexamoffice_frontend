import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseQuery';

export const syncApi = createApi({
  reducerPath: 'syncApi',
  baseQuery,
  endpoints: (builder) => ({
    triggerSyncPull: builder.mutation({
      query: () => ({
        url: '/sync/pull',
        method: 'POST',
      }),
    }),
    triggerSyncPush: builder.mutation({
      query: () => ({
        url: '/sync/push',
        method: 'POST',
      }),
    }),
  }),
});

export const { useTriggerSyncPullMutation, useTriggerSyncPushMutation } = syncApi;
