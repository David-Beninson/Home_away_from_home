import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postsApi, bookingsApi } from '../api/api';

export const fetchPosts = createAsyncThunk(
  'requests/fetchPosts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await postsApi.getOpenPosts();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'שגיאה בטעינת הבקשות');
    }
  }
);

// New: fetch both open posts and incoming bookings (for hosts) and merge them so hosts will see booking requests
export const fetchAllRequests = createAsyncThunk(
  'requests/fetchAllRequests',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch posts and incoming bookings in parallel
      const [postsRes, bookingsRes] = await Promise.all([
        postsApi.getOpenPosts(),
        bookingsApi.getIncomingBookings().catch((e) => ({ data: [] })),
      ]);

      const posts = postsRes?.data || [];
      const incoming = bookingsRes?.data || [];

      // Normalize incoming bookings minimally to be compatible with posts UI when possible
      const mappedIncoming = incoming.map((b) => ({
        // keep original booking fields and add a source marker
        ...b,
        source: 'booking',
      }));

      // Combine: posts first, then incoming bookings (avoid accidental duplicates by id)
      const combined = [...posts];
      const existingIds = new Set(posts.map((p) => String(p.id)));
      for (const it of mappedIncoming) {
        const id = String(it.id || it.match_id || it.booking_id || Math.random());
        if (!existingIds.has(id)) {
          combined.push(it);
        }
      }

      return combined;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'שגיאה בטעינת הבקשות המשולבות');
    }
  }
);

// Helper to compute badge count across mixed items
function computeBadgeCount(items = []) {
  return items.filter((p) => {
    if (!p) return false;
    if (p.status === 'open' || p.status === 'pending') return true;
    if (p.pending_match_id) return true;
    if (p.source === 'booking') return true; // incoming booking should count
    // Some bookings may use match_status
    if (p.match_status && p.match_status === 'pending') return true;
    return false;
  }).length;
}

const requestsSlice = createSlice({
  name: 'requests',
  initialState: {
    posts: [],
    badgeCount: 0,
    loading: true,
    error: null,
  },
  reducers: {
    setPosts: (state, action) => {
      state.posts = action.payload;
      state.badgeCount = computeBadgeCount(action.payload);
    },
    setBadgeCount: (state, action) => {
      state.badgeCount = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.badgeCount = computeBadgeCount(action.payload);
        state.loading = false;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAllRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllRequests.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.badgeCount = computeBadgeCount(action.payload);
        state.loading = false;
      })
      .addCase(fetchAllRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setPosts,
  setBadgeCount,
  setLoading,
  setError,
} = requestsSlice.actions;

export default requestsSlice.reducer;
