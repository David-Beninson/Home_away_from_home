import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  receiveNotification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../../store/notificationsSlice';
import { fetchCurrentUser } from '../../../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, MessageSquare, AlertCircle, Check, Trash2, Filter } from 'lucide-react';
import './NotificationBell.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();

  // 1. Current authenticated user
  const user = useSelector((state) => state.auth.user);
  const userId = user?.id || user?.user_id;

  // 2. Notification state from Redux store
  const { items: notifications, unreadCount } = useSelector((state) => state.notifications);

  const accountStatus = user?.account_status?.toLowerCase();

  // Fetch initial notifications on mount / login
  useEffect(() => {
    if (userId && accountStatus !== 'suspended' && accountStatus !== 'banned') {
      dispatch(fetchNotifications()).catch((err) => {
        if (!err?.isForbidden) console.error("Failed to fetch notifications", err);
      });
    }
  }, [userId, accountStatus, dispatch]);

  // 3. WebSocket Connection Hook with Auto-Reconnect and Heartbeat
  useEffect(() => {
    if (!userId || accountStatus === 'suspended' || accountStatus === 'banned') return;

    let socket = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    let isComponentMounted = true;
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
      const wsUrl = `${baseUrl}/api/ws/notifications/${userId}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        reconnectAttempt = 0;
        console.log('🟢 Connected to live notifications WS');

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
          if (incomingData?.type === 'pong') return;

          dispatch(receiveNotification(incomingData));

          if (
            incomingData?.verification_status ||
            incomingData?.id?.startsWith('approved_') ||
            incomingData?.id?.startsWith('rejected_')
          ) {
            console.log('⚡ Real-time verification status change received via WS!');
            dispatch(fetchCurrentUser());
            window.dispatchEvent(new CustomEvent('verification_status_changed', { detail: incomingData }));
          }

          if (incomingData?.popup) {
            setTimeout(() => {
              window.alert(`שים לב!\n\n${incomingData.message}`);
            }, 100);
          }
        } catch (err) {
          console.error('Error parsing WS notification:', err);
        }
      };

      socket.onclose = () => {
        console.log('🔴 Disconnected from live notifications WS');
        if (pingInterval) clearInterval(pingInterval);

        if (isComponentMounted) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
          reconnectAttempt += 1;
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect to live notifications WS...');
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
      isComponentMounted = false;
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
  }, [userId, dispatch]);

  // Handle clicking outside dropdown
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
    dispatch(markAllNotificationsAsRead());
  };

  const handleSingleMarkAsRead = (e, noteId) => {
    e.stopPropagation();
    if (noteId) {
      dispatch(markNotificationAsRead(noteId));
    }
  };

  const handleDeleteNotification = (e, noteId) => {
    e.stopPropagation();
    if (noteId) {
      dispatch(deleteNotification(noteId));
    }
  };

  const navigate = useNavigate();

  const handleNotificationClick = (note) => {
    const isUnread = !note.isRead && !note.is_read;
    if (note?.id && isUnread) {
      dispatch(markNotificationAsRead(note.id));
    }
    setIsOpen(false);

    const targetPath =
      note?.path ||
      note?.url ||
      note?.targetPath ||
      note?.target_path ||
      note?.data?.path ||
      note?.meta?.path ||
      note?.payload?.path;
    const targetState = note?.state || note?.targetState || note?.data?.state || note?.payload?.state || null;

    if (targetPath) {
      if (typeof targetPath === 'string' && /^https?:\/\//.test(targetPath)) {
        window.open(targetPath, '_blank');
        return;
      }
      navigate(targetPath, { state: targetState });
      return;
    }

    if (note?.type === 'message' || /צ'אט|chat|message/i.test(note?.title + ' ' + note?.message)) {
      const matchId = note?.match_id || note?.data?.match_id || note?.meta?.match_id || note?.payload?.match_id;
      const chatId = note?.chat_id || note?.data?.chat_id || note?.meta?.chat_id || note?.payload?.chat_id;
      if (matchId || chatId) {
        navigate('/chats', { state: { matchId, chatId } });
      } else {
        navigate('/chats');
      }
      return;
    }

    if (note?.type === 'verification' || /אימות|אימותים|verificat/i.test(note?.title + ' ' + note?.message)) {
      navigate('/admin/verifications');
      return;
    }

    if (note?.type === 'request' || /בקשה|בקשות|request/i.test(note?.title + ' ' + note?.message)) {
      const isAdmin = note?.meta?.for === 'admin' || note?.target_role === 'admin';
      navigate(isAdmin ? '/admin/bookings' : '/my-requests');
      return;
    }

    navigate('/');
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="nb-icon-success" />;
      case 'message':
        return <MessageSquare size={18} className="nb-icon-message" />;
      case 'alert':
        return <AlertCircle size={18} className="nb-icon-alert" />;
      default:
        return <Bell size={18} className="nb-icon-default" />;
    }
  };

  const filteredNotifications = notifications.filter((note) => {
    if (filterMode === 'unread') {
      return !note.isRead && !note.is_read;
    }
    return true;
  });

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
            {unreadCount > 0 && <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <div className="nb-header-title-row">
              <h3>התראות {unreadCount > 0 && <span className="nb-unread-count-pill">{unreadCount} חדשות</span>}</h3>
              {unreadCount > 0 && (
                <button className="nb-mark-read-btn" onClick={handleMarkAllAsRead} title="סמן הכל כנקרא">
                  <Check size={14} /> סמן הכל כנקרא
                </button>
              )}
            </div>

            <div className="nb-filter-bar">
              <button
                className={`nb-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                הכל ({notifications.length})
              </button>
              <button
                className={`nb-filter-btn ${filterMode === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterMode('unread')}
              >
                לא נקראו ({unreadCount})
              </button>
            </div>
          </div>

          <div className="nb-list">
            {filteredNotifications.length === 0 ? (
              <div className="nb-empty">
                <Bell size={32} strokeWidth={1} />
                <p>{filterMode === 'unread' ? 'אין לך התראות שלא נקראו' : 'אין לך התראות במערכת'}</p>
              </div>
            ) : (
              filteredNotifications.map((note) => {
                const isUnread = !note.isRead && !note.is_read;
                return (
                  <div
                    key={note.id}
                    className={`nb-item ${isUnread ? 'unread' : 'read'}`}
                    onClick={() => handleNotificationClick(note)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(note);
                    }}
                  >
                    <div className="nb-item-icon">{getIcon(note.type)}</div>
                    <div className="nb-item-content">
                      <div className="nb-item-header">
                        <h4 className={isUnread ? 'nb-unread-title' : 'nb-read-title'}>{note.title}</h4>
                        {isUnread && <span className="nb-unread-dot" title="לא נקרא" />}
                      </div>
                      <p>{note.message}</p>
                      <span className="nb-time">{note.time || note.created_at || 'עכשיו'}</span>
                    </div>

                    <div className="nb-actions">
                      {isUnread && (
                        <button
                          className="nb-action-btn nb-read-action"
                          onClick={(e) => handleSingleMarkAsRead(e, note.id)}
                          title="סמן כנקרא"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="nb-action-btn nb-delete-action"
                        onClick={(e) => handleDeleteNotification(e, note.id)}
                        title="מחק התראה"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}