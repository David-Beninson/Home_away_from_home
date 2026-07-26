import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { WhatsAppIcon } from '../Common/Icons';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';
import { User } from 'lucide-react';

export function ChatHeader({ activeChat, initialOpenDetailsModal = false }) {
  const [showDetailsModal, setShowDetailsModal] = useState(initialOpenDetailsModal);
  const currentUser = useSelector((state) => state.auth.user);
  const isHost = currentUser?.user_type === 'host';
  const buttonText = isHost ? 'פרטי אורח' : 'פרטי אירוח';

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
            {activeChat.other_party_name?.charAt(0) || 'א'}
          </div>
          <div>
            <h2 className="chat-header-title">
              {activeChat.hosting_date
                ? `${formatShortDate(activeChat.hosting_date)} · ${activeChat.other_party_name}`
                : activeChat.other_party_name}
            </h2>
            <p className="chat-header-status">
              <span className="chat-header-status-dot"></span>
              מחובר (מאושר)
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          {activeChat.hosting_date && (
            <div className="chat-header-date">
              {formatDate(activeChat.hosting_date)}
            </div>
          )}

          {/* Dynamic Details Button */}
          <button
            type="button"
            className="chat-header-details-btn"
            onClick={() => setShowDetailsModal(true)}
            data-tooltip={buttonText}
          >
            <User size={16} />
            <span>{buttonText}</span>
          </button>

          {/* WhatsApp Button */}
          <a
            href={`https://wa.me/${activeChat.other_party_phone ? activeChat.other_party_phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(`שלום, בהקשר לאירוח בתאריך ${formatShortDate(activeChat.hosting_date) || formatDate(activeChat.hosting_date) || ''}`)}`}
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

