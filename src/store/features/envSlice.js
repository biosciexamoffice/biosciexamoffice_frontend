import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const resolveEnvUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.__ELECTRON_DESKTOP__?.apiBase) {
      return `${window.__ELECTRON_DESKTOP__.apiBase.replace(/\/?$/,'')}/env`;
    }
    if (window.location.protocol === 'file:' && process?.env?.ELECTRON_API_BASE) {
      return `${process.env.ELECTRON_API_BASE.replace(/\/?$/,'')}/env`;
    }
  }
  if (typeof process !== 'undefined' && process.env?.ELECTRON_API_BASE) {
    return `${process.env.ELECTRON_API_BASE.replace(/\/?$/,'')}/env`;
  }
  return '/api/env';
};

export const fetchEnvironment = createAsyncThunk('env/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch(resolveEnvUrl(), { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const envSlice = createSlice({
  name: 'env',
  initialState: {
    mode: 'UNKNOWN',
    readOnly: false,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnvironment.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEnvironment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.mode = action.payload?.mode || 'UNKNOWN';
        state.readOnly = Boolean(action.payload?.readOnly);
      })
      .addCase(fetchEnvironment.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Failed to load environment info.';
      });
  },
});

export const selectEnvMode = (state) => state.env.mode;
export const selectEnvStatus = (state) => state.env.status;
export const selectEnvError = (state) => state.env.error;
export const selectIsReadOnly = (state) => Boolean(state.env.readOnly);

export default envSlice.reducer;
