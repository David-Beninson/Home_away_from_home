import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { WhatsAppIcon } from '../Common/Icons';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';
import { User, AlertCircle, Info } from 'lucide-react';
import { getChatDisplayName } from '../../utils/chatUtils';
import { useTranslation } from 'react-i18next';

export function ChatHeader({ activeChat, initialOpenDetailsModal = false }) {
  const { t } = useTranslation(['chat/chats']);
  const [showDetailsModal, setShowDetailsModal] = useState(initialOpenDetailsModal);
  const currentUser = useSelector((state) => state.auth.user);
  
  const isHostView = currentUser?.user_type === 'host';
  const isAnonymousGuest = isHostView && activeChat?.is_anonymous;

  const otherPartyName = isAnonymousGuest 
    ? t('chat/chats:header.anonymous_guest')
    : getChatDisplayName(activeChat) || (isHostView ? t('chat/chats:header.anonymous_guest') : t('chat/chats:header.host'));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar">
            {otherPartyName?.charAt(0) || 'א'}
          </div>
          <div>
            <h2 className="chat-header-title">
              {activeChat.hosting_date
                ? `${formatShortDate(activeChat.hosting_date)} · ${otherPartyName}`
                : otherPartyName}
            </h2>
            <p className="chat-header-status">
              <span className="chat-header-status-dot"></span>
              {t('chat/chats:header.status_connected')}
            </p>
          </div>
        </div>
        
        {isAnonymousGuest && (
          <div className="chat-anonymous-warning" title={t('chat/chats:header.anonymous_warning')}>
            <AlertCircle size={16} />
            <span>{t('chat/chats:header.anonymous_warning')}</span>
          </div>
        )}

        <div className="chat-header-actions">
          {activeChat.hosting_date && (
            <div className="chat-header-date">
              {formatDate(activeChat.hosting_date)}
            </div>
          )}

          <button 
            type="button"
            className="chat-header-details-btn"
            onClick={() => setShowDetailsModal(true)}
          >
            <Info size={16} />
            <span>{isHostView ? t('chat/chats:header.btn_hosting_details') : t('chat/chats:header.btn_profile_details')}</span>
          </button>

          <a
            href={`https://wa.me/${activeChat.other_party_phone ? activeChat.other_party_phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(`${t('chat/chats:header.wa_message_prefix')} ${formatShortDate(activeChat.hosting_date) || formatDate(activeChat.hosting_date) || ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-header-wa-btn"
            data-tooltip="לחיצה על זה יפתח קישור לוואצאפ"
          >
            <WhatsAppIcon size={16} />
          </a>
        </div>
      </div>

      <HostingDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        data={activeChat}
      />
    </>
  );
}

