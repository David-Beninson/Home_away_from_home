import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/api';

export const fetchMyChats = createAsyncThunk(
  'chat/fetchMyChats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/my-chats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'שגיאה בטעינת הצ׳אטים');
    }
  }
);

export const markChatAsRead = createAsyncThunk(
  'chat/markChatAsRead',
  async (matchId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/matches/${matchId}/chat/read`);
      return { matchId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'שגיאה בעדכון קריאה');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    unreadTotalCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    receiveNewMessage: (state, action) => {
      const { match_id, content, created_at, sender_id, is_mine } = action.payload;
      const chatIndex = state.chats.findIndex(c => c.match_id === match_id);
      if (chatIndex !== -1) {
        state.chats[chatIndex].last_message = content;
        state.chats[chatIndex].last_message_time = created_at;
        if (!is_mine) {
          state.chats[chatIndex].unread_count += 1;
          state.unreadTotalCount += 1;
        }
        // Move chat to top
        const [chat] = state.chats.splice(chatIndex, 1);
        state.chats.unshift(chat);
      }
    },
    clearChatUnread: (state, action) => {
      const matchId = action.payload;
      const chat = state.chats.find(c => c.match_id === matchId);
      if (chat && chat.unread_count > 0) {
        state.unreadTotalCount -= chat.unread_count;
        chat.unread_count = 0;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyChats.fulfilled, (state, action) => {
        state.chats = action.payload;
        state.unreadTotalCount = action.payload.reduce((sum, chat) => sum + chat.unread_count, 0);
        state.loading = false;
      })
      .addCase(fetchMyChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markChatAsRead.fulfilled, (state, action) => {
        const { matchId } = action.payload;
        const chat = state.chats.find(c => c.match_id === matchId);
        if (chat && chat.unread_count > 0) {
          state.unreadTotalCount -= chat.unread_count;
          chat.unread_count = 0;
        }
      });
  },
});

export const { receiveNewMessage, clearChatUnread } = chatSlice.actions;
export default chatSlice.reducer;
