import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPosts, setLoading, fetchPosts, fetchAllRequests } from '../store/requestsSlice';

const MAX_RECONNECT_DELAY_MS = 30000;
const TEARDOWN_GRACE_MS = 150;

let sharedSocket = null;
let sharedReconnectTimeout = null;
let sharedSubscriberCount = 0;
let reconnectAttempt = 0;
let intentionalClose = false;
let pendingTeardownTimeout = null;
let latestDispatch = null;

function buildPostsWsUrl(token) {
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
  return `${baseUrl}/api/posts/ws?token=${encodeURIComponent(token)}`;
}

function clearSharedReconnectTimeout() {
  if (sharedReconnectTimeout) {
    clearTimeout(sharedReconnectTimeout);
    sharedReconnectTimeout = null;
  }
}

function closeSharedSocket() {
  clearSharedReconnectTimeout();
  if (!sharedSocket) return;

  const ws = sharedSocket;
  sharedSocket = null;
  ws.onopen = null;
  ws.onmessage = null;
  ws.onerror = null;
  ws.onclose = null;

  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    try {
      ws.close(1000, 'Client shutdown');
    } catch {
      // ignore close races
    }
  }
}

function scheduleSharedReconnect(token) {
  if (intentionalClose || sharedSubscriberCount <= 0) return;

  clearSharedReconnectTimeout();
  const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
  reconnectAttempt += 1;

  sharedReconnectTimeout = setTimeout(() => {
    sharedReconnectTimeout = null;
    connectSharedPostsSocket(token);
  }, delay);
}

function connectSharedPostsSocket(token) {
  if (intentionalClose || sharedSubscriberCount <= 0) return;
  if (
    sharedSocket &&
    (sharedSocket.readyState === WebSocket.OPEN ||
      sharedSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  closeSharedSocket();
  intentionalClose = false;

  const ws = new WebSocket(buildPostsWsUrl(token));
  sharedSocket = ws;

  ws.onopen = () => {
    reconnectAttempt = 0;
    console.log('Global Posts WebSocket connected');
  };

  ws.onmessage = (event) => {
    if (!latestDispatch) return;
    try {
      const data = JSON.parse(event.data);
      if (data && data.type === 'HOST_AVAILABILITY_UPDATED') {
        window.dispatchEvent(new CustomEvent('host_availability_updated', { detail: data }));
      } else if (Array.isArray(data)) {
        latestDispatch(setPosts(data));
      }
      latestDispatch(setLoading(false));
    } catch (err) {
      console.error('Error parsing posts WS data:', err);
    }
  };

  ws.onerror = (err) => {
    console.warn('Global Posts WebSocket error (using HTTP fallback):', err);
  };

  ws.onclose = (event) => {
    if (sharedSocket === ws) {
      sharedSocket = null;
    }
    if (intentionalClose || sharedSubscriberCount <= 0) return;
    if (event.code !== 1000) {
      scheduleSharedReconnect(token);
    }
  };
}

export function useGlobalWebSocket(userRole) {
  const dispatch = useDispatch();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const user = useSelector((state) => state.auth.user);
  const accountStatus = user?.account_status?.toLowerCase();

  useEffect(() => {
    latestDispatch = dispatchRef.current;
  }, [dispatch]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Do not connect, and disconnect if already connected for suspended/banned users
    if (accountStatus === 'suspended' || accountStatus === 'banned') {
      intentionalClose = true;
      closeSharedSocket();
      return;
    }

    if (!token) {
      dispatch(setLoading(false));
      return;
    }

    // Fetch initial posts / requests instantly via HTTP REST API
    // If hook caller passes userRole as 'host' we want incoming bookings too
    if (userRole === 'host') {
      dispatch(fetchAllRequests());
    } else {
      dispatch(fetchPosts());
    }

    latestDispatch = dispatchRef.current;
    sharedSubscriberCount += 1;
    intentionalClose = false;

    if (pendingTeardownTimeout) {
      clearTimeout(pendingTeardownTimeout);
      pendingTeardownTimeout = null;
    }

    connectSharedPostsSocket(token);

    return () => {
      sharedSubscriberCount = Math.max(0, sharedSubscriberCount - 1);

      if (sharedSubscriberCount > 0) return;

      intentionalClose = true;
      clearSharedReconnectTimeout();

      pendingTeardownTimeout = setTimeout(() => {
        pendingTeardownTimeout = null;
        if (sharedSubscriberCount <= 0) {
          closeSharedSocket();
        }
      }, TEARDOWN_GRACE_MS);
    };
  }, [userRole, dispatch]);
}
