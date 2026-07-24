import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { receiveNotification, markAllAsRead, markAsRead } from '../../../store/notificationsSlice';
import { fetchCurrentUser } from '../../../store/authSlice';
import { Bell, CheckCircle2, MessageSquare, AlertCircle, Check } from 'lucide-react';
import './NotificationBell.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();

  // 1. Pull the current user from Redux so we know who to connect as
  const user = useSelector((state) => state.auth.user);
  // (Make sure this matches exactly how the ID is stored in your auth object, e.g., user.id or user._id)
  const userId = user?.id || user?.user_id; 

  // 2. Pull notification data straight from Redux
  const { items: notifications, unreadCount } = useSelector((state) => state.notifications);

  // 3. The WebSocket Connection Hook with Auto-Reconnect and Heartbeat
  useEffect(() => {
    if (!userId) return;

    let socket = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    let isComponentMounted = true;

    const connectWebSocket = () => {
      // Dynamic WS/WSS URL resolution
      let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      // Strip trailing slashes and trailing /api to avoid /api/api
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
      const wsUrl = `${baseUrl}/api/ws/notifications/${userId}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("🟢 Connected to live notifications WS");

        // Start heartbeat ping every 25 seconds
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const incomingData = JSON.parse(event.data);
          // Ignore heartbeat pong messages
          if (incomingData?.type === 'pong') return;

          dispatch(receiveNotification(incomingData));

          // If this is a live verification approval or rejection event from admin:
          if (
            incomingData?.verification_status ||
            incomingData?.id?.startsWith('approved_') ||
            incomingData?.id?.startsWith('rejected_')
          ) {
            console.log("⚡ Real-time verification status change received via WS! Updating user state...");
            dispatch(fetchCurrentUser());
            window.dispatchEvent(new CustomEvent('verification_status_changed', { detail: incomingData }));
          }
        } catch (err) {
          console.error("Error parsing WS notification:", err);
        }
      };

      socket.onclose = () => {
        console.log("🔴 Disconnected from live notifications WS");
        if (pingInterval) clearInterval(pingInterval);

        // Auto reconnect after 4 seconds if component is still mounted
        if (isComponentMounted) {
          reconnectTimeout = setTimeout(() => {
            console.log("🔄 Attempting to reconnect to live notifications WS...");
            connectWebSocket();
          }, 4000);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        socket?.close();
      };
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close();
      }
    };
  }, [userId, dispatch]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleNotificationClick = (id) => {
    dispatch(markAsRead(id));
    setIsOpen(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} className="nb-icon-success" />;
      case 'message': return <MessageSquare size={18} className="nb-icon-message" />;
      case 'alert': return <AlertCircle size={18} className="nb-icon-alert" />;
      default: return <Bell size={18} className="nb-icon-default" />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className={`nb-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="התראות"
      >
        <div className="navbar-left">
          <div className="notification-bell">
            <Bell className="nav-icon" size={22} />
            {unreadCount > 0 && (
              <span className="bell-badge"></span>
            )}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="nb-dropdown">
          <div className="nb-header">
            {unreadCount > 0 ? (
              <>
                <h3>{unreadCount} התראות חדשות</h3>
                <button className="nb-mark-read-btn" onClick={handleMarkAllAsRead}>
                  <Check size={14} /> סמן הכל כנקרא
                </button>
              </>
            ) : (
              <h3>התראות</h3>
            )}
          </div>

          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty">
                <Bell size={32} strokeWidth={1} />
                <p>אין לך התראות חדשות</p>
              </div>
            ) : (
              notifications.map((note) => (
                <div
                  key={note.id}
                  className={`nb-item ${!note.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(note.id)}
                >
                  <div className="nb-item-icon">
                    {getIcon(note.type)}
                  </div>
                  <div className="nb-item-content">
                    <h4>{note.title}</h4>
                    <p>{note.message}</p>
                    <span className="nb-time">{note.time}</span>
                  </div>
                  {!note.isRead && <div className="nb-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}