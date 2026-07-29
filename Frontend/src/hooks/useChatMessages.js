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
    if (!activeChat || !user) {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        const staleSocket = wsRef.current;
        wsRef.current = null;
        staleSocket.onopen = null;
        staleSocket.onmessage = null;
        staleSocket.onclose = null;
        staleSocket.onerror = null;
        if (
          staleSocket.readyState === WebSocket.OPEN ||
          staleSocket.readyState === WebSocket.CONNECTING
        ) {
          try {
            staleSocket.close(1000, 'Chat inactive');
          } catch {
            // ignore close races
          }
        }
      }
      activeChatIdRef.current = null;
      return;
    }

    const matchId = activeChat.match_id;
    if (wsRef.current && activeChatIdRef.current === matchId) {
      return;
    }

    // Close previous socket
    if (wsRef.current) {
      const previousSocket = wsRef.current;
      wsRef.current = null;
      previousSocket.onopen = null;
      previousSocket.onmessage = null;
      previousSocket.onclose = null;
      previousSocket.onerror = null;
      if (
        previousSocket.readyState === WebSocket.OPEN ||
        previousSocket.readyState === WebSocket.CONNECTING
      ) {
        try {
          previousSocket.close(1000, 'Switching chat');
        } catch {
          // ignore close races
        }
      }
    }

    // Clear messages for the new chat immediately
    setMessages([]);
    activeChatIdRef.current = matchId;

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
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;

      if (wsRef.current === socket) {
        wsRef.current = null;
      }
      if (activeChatIdRef.current === matchId) {
        activeChatIdRef.current = null;
      }

      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.close(1000, 'Chat effect cleanup');
        } catch {
          // ignore close races
        }
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.onopen = () => {
          try {
            socket.close(1000, 'Chat effect cleanup');
          } catch {
            // ignore close races
          }
        };
      }
    };
  }, [activeChat?.match_id, dispatch, user?.id]);

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
