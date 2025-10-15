import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../features/authSlice';

// Default to backend's configured port (see server/.env -> PORT)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
  }

  return result;
};

export default baseQuery;
