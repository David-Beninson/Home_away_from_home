import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api/api';

// Async Thunks
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return rejectWithValue('No token found');
    }
    try {
      const response = await authApi.getMe();
      return response.data; // The user object (contains user_type, full_name, etc.)
    } catch (error) {
      // If unauthorized (401), token is cleared by interceptor, but we clean state here
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user profile');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      const data = await authApi.login(credentials);
      // authApi.login sets localStorage token, now load user profile details
      await dispatch(fetchCurrentUser()).unwrap();
      return data;
    } catch (error) {
      if (error?.response?.status === 401) {
        return rejectWithValue('שם משתמש או סיסמה שגויים');
      }
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
        ? detail.map(e => e.msg || e.detail).join(', ')
        : (error?.message || 'שם משתמש או סיסמה שגויים');
      return rejectWithValue(message || 'שם משתמש או סיסמה שגויים');
    }
  }
);

const cachedUser = (() => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
})();

const initialState = {
  user: cachedUser,
  token: localStorage.getItem('token') || null,
  loading: !!localStorage.getItem('token') && !cachedUser, // only show loader if token exists but no cached user details
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
    },
    setAuthCredentials: (state, action) => {
      state.token = action.payload.token;
      state.loading = true; // Set to true since we should fetch details next
    },
    // Allow setting the current user object directly (useful for optimistic updates)
    setCurrentUser: (state, action) => {
      state.user = action.payload;
      try {
        localStorage.setItem('user', JSON.stringify(action.payload));
      } catch (e) {
        // ignore localStorage failures
      }
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = !state.user; // Only show loader if we don't have user details loaded yet
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.token = localStorage.getItem('token');
        localStorage.setItem('user', JSON.stringify(action.payload));
        state.loading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, setAuthCredentials, setCurrentUser } = authSlice.actions;
export default authSlice.reducer;
