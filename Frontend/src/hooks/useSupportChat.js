import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { verificationApi, adminApi } from '../api/api';
import { useWebSocket } from './useWebSocket';

export function useSupportChat(targetUserId = null) {
  const user = useSelector((state) => state.auth.user);
  const currentUserId = user?.id;
  const effectiveUserId = targetUserId || currentUserId;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 1. Fetch initial message history
  const fetchMessages = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      setLoading(true);
      let res;
      if (user?.user_type === 'admin' && targetUserId) {
        res = await adminApi.getSupportChatHistory(targetUserId);
      } else {
        res = await verificationApi.getSupportMessages();
      }
      setMessages(res.data || []);
    } catch (err) {
      console.error('Failed to load support chat history:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, targetUserId, user?.user_type]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 2. Real-time WebSocket connection
  const handleMessage = useCallback((data) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.id)) return prev;
      return [...prev, data];
    });
  }, []);

  useWebSocket({
    url: `/api/verification/ws/support/${effectiveUserId}`,
    onMessage: handleMessage,
    enabled: Boolean(effectiveUserId)
  });

  // 3. Send Message Handler with Instant Optimistic UI Update
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !effectiveUserId) return;

    const textToSend = messageText.trim();
    setMessageText('');

    // Instant optimistic update for sender (0ms latency)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempMsg = {
      id: tempId,
      user_id: effectiveUserId,
      sender_id: currentUserId,
      sender_name: user?.user_type === 'admin' ? 'הנהלת המערכת' : (user?.full_name || 'אתה'),
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      let res;
      if (user?.user_type === 'admin' && targetUserId) {
        res = await adminApi.replyToSupportChat(targetUserId, textToSend);
      } else {
        res = await verificationApi.sendSupportMessage(textToSend, targetUserId);
      }

      const realMsg = res.data;
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId && m.id !== realMsg.id);
        return [...filtered, realMsg];
      });
    } catch (err) {
      console.error('Failed to send support message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  return {
    messages,
    loading,
    messageText,
    setMessageText,
    sendMessage,
    messagesEndRef,
    currentUserId,
  };
}
