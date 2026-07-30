
import { useState, useEffect } from 'react';
import { ChatItem } from './ChatItem';
import { isUpcomingOrActiveChat } from '../../utils/chatUtils';
import { useTranslation } from 'react-i18next';

export function ChatSidebar({ chats = [], loading, activeChat, onSelectChat }) {
  const { t } = useTranslation(['chat/chats']);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeChats = chats.filter(isUpcomingOrActiveChat);
  const pastChats = chats.filter(c => !isUpcomingOrActiveChat(c));

  useEffect(() => {
    if (activeChat && pastChats.some(c => c.match_id === activeChat.match_id)) {
      setIsHistoryOpen(true);
    }
  }, [activeChat, pastChats]);

  return (
    <div className="chats-sidebar">
      <div className="chats-sidebar-header">{t('chat/chats:sidebar.title')}</div>
      <div className="chats-list">
        {loading && chats.length === 0 ? (
          <p className="chats-status-message">{t('chat/chats:sidebar.loading')}</p>
        ) : chats.length === 0 ? (
          <p className="chats-status-message">{t('chat/chats:sidebar.no_chats')}</p>
        ) : (
          <>
            {activeChats.length === 0 ? (
              <p className="chats-status-message">{t('chat/chats:sidebar.no_active_chats')}</p>
            ) : (
              activeChats.map(chat => (
                <ChatItem
                  key={chat.match_id}
                  chat={chat}
                  isActive={activeChat?.match_id === chat.match_id}
                  onSelectChat={onSelectChat}
                />
              ))
            )}

            {pastChats.length > 0 && (
              <div className="chats-history-section">
                <button
                  type="button"
                  className="chats-history-toggle"
                  onClick={() => setIsHistoryOpen(prev => !prev)}
                >
                  <span className="chats-history-title">
                    {t('chat/chats:sidebar.history_title', { count: pastChats.length })}
                  </span>
                  <span className={`chats-history-chevron ${isHistoryOpen ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>
                {isHistoryOpen && (
                  <div className="chats-history-list">
                    {pastChats.map(chat => (
                      <ChatItem
                        key={chat.match_id}
                        chat={chat}
                        isActive={activeChat?.match_id === chat.match_id}
                        onSelectChat={onSelectChat}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
