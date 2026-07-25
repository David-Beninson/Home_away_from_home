import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/api'; // Use real backend API client

export const fetchDashboardStats = createAsyncThunk(
  'stats/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/stats/guest-dashboard');
      const d = response.data || {};

      // Normalize backend keys to the frontend shape to avoid undefined fields
      return {
        availableHosts: d.availableHosts ?? d.available_hosts ?? 0,
        availableSpots: d.availableSpots ?? d.available_spots ?? 0,
        hostsWithSleepover: d.hostsWithSleepover ?? d.hosts_with_sleepover ?? 0,
        totalHosts: d.total_hosts ?? d.totalHosts ?? 0,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to fetch stats');
    }
  }
);


const statsSlice = createSlice({
  name: 'stats',
  initialState: {
    data: {
      availableHosts: 0,
      availableSpots: 0,
      openRequests: 0,
      hostsWithSleepover: 0
    },
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export default statsSlice.reducer;