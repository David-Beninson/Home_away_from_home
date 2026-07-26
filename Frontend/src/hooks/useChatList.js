import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { fetchMyChats, markChatAsRead, clearChatUnread } from '../store/chatSlice';

export function useChatList() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { chats, loading } = useSelector(state => state.chat);
  const [activeChat, setActiveChat] = useState(null);

  const targetChatData = location.state?.chatData;
  const targetMatchId = location.state?.matchId || targetChatData?.match_id;

  // Combined list including target provisional chat if not in backend list yet
  const displayChats = [...(chats || [])];
  if (targetChatData && targetChatData.match_id) {
    const exists = displayChats.some(c => c.match_id === targetChatData.match_id);
    if (!exists) {
      displayChats.unshift(targetChatData);
    }
  }

  // Fetch chats on mount
  useEffect(() => {
    dispatch(fetchMyChats());
  }, [dispatch]);

  // Auto-select chat when chats list loads or location state has target chat
  useEffect(() => {
    if (displayChats.length > 0) {
      if (targetMatchId) {
        const found = displayChats.find(c => c.match_id === targetMatchId);
        if (found) {
          setActiveChat(found);
          return;
        }
      }
      // Only auto-select first chat if nothing is selected yet
      setActiveChat(prev => prev ?? displayChats[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, targetMatchId]);

  const handleSelectChat = useCallback((chat) => {
    if (chat.match_id !== activeChat?.match_id) {
      // Optimistically clear unread badge immediately on click
      if (chat.unread_count > 0) {
        dispatch(clearChatUnread(chat.match_id));    // Optimistic UI update (sync)
        dispatch(markChatAsRead(chat.match_id));     // Persist to server (async)
      }
      setActiveChat(chat);
    }
  }, [activeChat, dispatch]);

  return {
    chats: displayChats,
    loading,
    activeChat,
    handleSelectChat,
  };
}
