

import { getChatDisplayName } from '../../utils/chatUtils';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/date';

export function ChatItem({ chat, isActive, onSelectChat }) {
  const { t } = useTranslation(['chat/chats']);
  const displayName = getChatDisplayName(chat);

  return (
    <div
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelectChat(chat)}
    >
      <div className="chat-item-content">
        <div className="chat-item-avatar">
          {displayName?.charAt(0) || 'א'}
        </div>
        <div className="chat-item-info">
          <div className="chat-item-top">
            <h3 className="chat-item-name">{displayName}</h3>
            {chat.last_message_time && (
              <span className="chat-item-time">
                {formatTime(chat.last_message_time)}
              </span>
            )}
          </div>
          <div className="chat-item-bottom">
            <p className="chat-item-preview">{chat.last_message || t('chat/chats:item.no_messages')}</p>
            {chat.unread_count > 0 && (
              <span className="chat-item-badge">
                {chat.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
