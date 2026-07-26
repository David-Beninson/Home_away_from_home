import { createSlice } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [], // Array starts completely empty now!
    unreadCount: 0,
  },
  reducers: {
    receiveNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    markAllAsRead: (state) => {
      state.items.forEach(item => item.isRead = true);
      state.unreadCount = 0;
    },
    markAsRead: (state, action) => {
      const notification = state.items.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    removeNotification: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.unreadCount = state.items.filter(n => !n.isRead).length;
    }
  }
});

export const { 
  receiveNotification, 
  markAllAsRead, 
  markAsRead, 
  removeNotification 
} = notificationsSlice.actions;

export default notificationsSlice.reducer;