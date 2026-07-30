import { useEffect } from 'react';

export function useWebSocket({ url, onMessage, onOpen, enabled = true }) {
  useEffect(() => {
    if (!enabled || !url) return;

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
      
      let finalUrl = url;
      if (url.startsWith('/')) {
        finalUrl = `${baseUrl}${url}`;
        if (finalUrl.includes('?')) {
            finalUrl += `&token=${token}`;
        } else {
            finalUrl += `?token=${token}`;
        }
      }

      socket = new WebSocket(finalUrl);

      socket.onopen = () => {
        reconnectAttempt = 0;
        console.log(`🟢 Connected to WebSocket: ${url}`);
        if (onOpen) onOpen();

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
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        console.log(`🔴 Disconnected from WebSocket: ${url}`);
        if (pingInterval) clearInterval(pingInterval);

        if (isMounted) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
          reconnectAttempt += 1;
          reconnectTimeout = setTimeout(() => {
            console.log(`🔄 Attempting to reconnect to WS: ${url}...`);
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket?.close();
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Component unmounted');
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try {
              socket.close(1000, 'Component unmounted');
            } catch {
              // ignore race
            }
          };
        }
      }
    };
  }, [url, enabled, onMessage, onOpen]);
}
