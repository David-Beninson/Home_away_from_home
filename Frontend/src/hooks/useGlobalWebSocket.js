import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setPosts, setLoading, fetchPosts } from '../store/requestsSlice';

export function useGlobalWebSocket(userRole) {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch(setLoading(false));
      return;
    }

    // Fetch initial posts instantly via HTTP REST API
    dispatch(fetchPosts());

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
    const wsUrl = `${baseUrl}/api/posts/ws?token=` + encodeURIComponent(token);

    function connect() {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('Global Posts WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'HOST_AVAILABILITY_UPDATED') {
            window.dispatchEvent(new CustomEvent('host_availability_updated', { detail: data }));
          } else if (Array.isArray(data)) {
            dispatch(setPosts(data));
          }
          dispatch(setLoading(false));
        } catch (err) {
          console.error('Error parsing posts WS data:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('Global Posts WebSocket error (using HTTP fallback):', err);
      };

      ws.onclose = (event) => {
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    }

    connect();

    return () => {
      if (socketRef.current) {
        const ws = socketRef.current;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try { ws.close(); } catch {}
          };
        }
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userRole, dispatch]);
}

