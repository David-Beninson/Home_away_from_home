import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { markChatAsRead, receiveNewMessage, clearChatUnread } from '../store/chatSlice';
import api from '../api/api';

export function useChatMessages(activeChat) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Connect WebSocket when activeChat changes
  useEffect(() => {
    if (!activeChat || !user) return;
    if (activeChatIdRef.current === activeChat.match_id) return; // already connected

    // Close previous socket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear messages for the new chat immediately
    setMessages([]);
    activeChatIdRef.current = activeChat.match_id;

    // Mark as read
    if (activeChat.unread_count > 0) {
      dispatch(markChatAsRead(activeChat.match_id));
    }

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws');
    const socket = new WebSocket(`${wsBaseUrl}/matches/${activeChat.match_id}/chat/ws?token=${token}`);

    socket.onopen = () => {
      console.log('[WS] Connected to chat', activeChat.match_id);
      // Start heartbeat to keep connection alive through proxies/load balancers
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Ignore heartbeat pong
        if (msg?.type === 'pong') return;
        setMessages(prev => [...prev, msg]);
        dispatch(receiveNewMessage({ ...msg, is_mine: false }));

        const incomingMatchId = msg.match_id ?? activeChatIdRef.current;
        if (incomingMatchId && incomingMatchId === activeChatIdRef.current) {
          dispatch(clearChatUnread(incomingMatchId));
          dispatch(markChatAsRead(incomingMatchId));
        }
      } catch (err) {
        console.error('[WS] Failed to parse message', err);
      }
    };

    socket.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    socket.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason);
    };

    wsRef.current = socket;

    // Fetch message history
    api.get(`/matches/${activeChat.match_id}/messages`)
      .then(res => setMessages(res.data))
      .catch(err => console.error('[Chat] Failed to fetch history:', err));

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      socket.close();
      wsRef.current = null;
      activeChatIdRef.current = null;
    };
  }, [activeChat?.match_id, dispatch, user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback((e) => {
    e?.preventDefault();
    const text = messageText.trim();
    if (!text) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[Chat] WebSocket not open');
      return;
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      match_id: activeChat?.match_id,
      sender_id: user?.id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    dispatch(receiveNewMessage({ ...optimisticMsg, is_mine: true }));

    ws.send(text);
    setMessageText('');
  }, [messageText, activeChat, user, dispatch]);

  return {
    messages,
    messageText,
    setMessageText,
    sendMessage,
    messagesEndRef,
    user,
  };
}
