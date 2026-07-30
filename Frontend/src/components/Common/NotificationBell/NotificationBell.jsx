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
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, MessageSquare, AlertCircle, Check, Trash2, Filter } from 'lucide-react';
import { translateNotificationTitle, translateNotificationMessage } from '../../../utils/notificationTranslator';
import { useWebSocket } from '../../../hooks/useWebSocket';
import './NotificationBell.css';

export default function NotificationBell() {
  const { t } = useTranslation(['common/notifications']);
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
  const handleMessage = React.useCallback((incomingData) => {
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
        const translatedMsg = translateNotificationMessage(incomingData.message, t);
        window.alert(t('common/notifications:alert_message', { message: translatedMsg }));
      }, 100);
    }
  }, [dispatch, t]);

  useWebSocket({
    url: `/api/ws/notifications/${userId}`,
    onMessage: handleMessage,
    enabled: Boolean(userId && accountStatus !== 'suspended' && accountStatus !== 'banned')
  });

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
        aria-label={t('common/notifications:aria_label')}
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
              <h3>{t('common/notifications:title')} {unreadCount > 0 && <span className="nb-unread-count-pill">{t('common/notifications:new_count', { count: unreadCount })}</span>}</h3>
              {unreadCount > 0 && (
                <button className="nb-mark-read-btn" onClick={handleMarkAllAsRead} title={t('common/notifications:mark_all_read')}>
                  <Check size={14} /> {t('common/notifications:mark_all_read')}
                </button>
              )}
            </div>

            <div className="nb-filter-bar">
              <button
                className={`nb-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                {t('common/notifications:filter_all', { count: notifications.length })}
              </button>
              <button
                className={`nb-filter-btn ${filterMode === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterMode('unread')}
              >
                {t('common/notifications:filter_unread', { count: unreadCount })}
              </button>
            </div>
          </div>

          <div className="nb-list">
            {filteredNotifications.length === 0 ? (
              <div className="nb-empty">
                <Bell size={32} strokeWidth={1} />
                <p>{filterMode === 'unread' ? t('common/notifications:empty_unread') : t('common/notifications:empty_all')}</p>
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
                        <h4 className={isUnread ? 'nb-unread-title' : 'nb-read-title'}>
                          {translateNotificationTitle(note.title, t)}
                        </h4>
                        {isUnread && <span className="nb-unread-dot" title={t('common/notifications:tooltip_unread')} />}
                      </div>
                      <p>{translateNotificationMessage(note.message, t)}</p>
                      <span className="nb-time">{note.time || note.created_at || t('common/notifications:now')}</span>
                    </div>

                    <div className="nb-actions">
                      {isUnread && (
                        <button
                          className="nb-action-btn nb-read-action"
                          onClick={(e) => handleSingleMarkAsRead(e, note.id)}
                          title={t('common/notifications:tooltip_mark_read')}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="nb-action-btn nb-delete-action"
                        onClick={(e) => handleDeleteNotification(e, note.id)}
                        title={t('common/notifications:tooltip_delete')}
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