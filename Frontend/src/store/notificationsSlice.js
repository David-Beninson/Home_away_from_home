import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsApi } from '../api/api';

// Async Thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationsApi.getNotifications();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markNotificationAsRead',
  async (id, { rejectWithValue }) => {
    try {
      await notificationsApi.markAsRead(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllNotificationsAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id, { rejectWithValue }) => {
    try {
      await notificationsApi.deleteNotification(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    receiveNotification: (state, action) => {
      const newNotif = action.payload;
      // Prevent duplicates if already fetched/pushed
      const exists = state.items.some((item) => item.id === newNotif.id);
      if (!exists) {
        state.items.unshift(newNotif);
        if (!newNotif.isRead && !newNotif.is_read) {
          state.unreadCount += 1;
        }
      }
    },
    markAllAsReadLocal: (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
        item.is_read = true;
      });
      state.unreadCount = 0;
    },
    markAsReadLocal: (state, action) => {
      const notification = state.items.find((n) => n.id === action.payload);
      if (notification && (!notification.isRead && !notification.is_read)) {
        notification.isRead = true;
        notification.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    removeNotificationLocal: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.unreadCount = state.items.filter((n) => !n.isRead && !n.is_read).length;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.isRead && !n.is_read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // markNotificationAsRead
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const id = action.payload;
        const item = state.items.find((n) => n.id === id);
        if (item && (!item.isRead && !item.is_read)) {
          item.isRead = true;
          item.is_read = true;
        }
        state.unreadCount = state.items.filter((n) => !n.isRead && !n.is_read).length;
      })

      // markAllNotificationsAsRead
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          item.isRead = true;
          item.is_read = true;
        });
        state.unreadCount = 0;
      })

      // deleteNotification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.filter((n) => n.id !== id);
        state.unreadCount = state.items.filter((n) => !n.isRead && !n.is_read).length;
      });
  },
});

export const {
  receiveNotification,
  markAllAsReadLocal,
  markAsReadLocal,
  removeNotificationLocal,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;