import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { verificationApi, adminApi } from '../api/api';

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
  useEffect(() => {
    if (!effectiveUserId) return;

    let socket = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    let isMounted = true;
    let reconnectAttempt = 0;
    const MAX_RECONNECT_DELAY_MS = 30000;

    const connectWebSocket = () => {
      let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

      if (baseUrl.startsWith('https://')) {
        baseUrl = baseUrl.replace(/^https:\/\//, 'wss://');
      } else if (baseUrl.startsWith('http://')) {
        baseUrl = baseUrl.replace(/^http:\/\//, 'ws://');
      } else if (!baseUrl.startsWith('ws://') && !baseUrl.startsWith('wss://')) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        baseUrl = `${protocol}//${window.location.host}`;
      }
      baseUrl = baseUrl.replace(/\/+$/, '');

      const token = localStorage.getItem('token') || '';
      const wsUrl = `${baseUrl}/api/verification/ws/support/${effectiveUserId}?token=${token}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        reconnectAttempt = 0;
        console.log('🟢 Connected to Support Chat WebSocket');
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'pong') return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data];
          });
        } catch (err) {
          console.error('Error parsing support WS message:', err);
        }
      };

      socket.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (isMounted) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
          reconnectAttempt += 1;
          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = (err) => {
        console.error('Support WebSocket error:', err);
        socket?.close();
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try { socket.close(); } catch {}
          };
        }
      }
    };
  }, [effectiveUserId]);

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
