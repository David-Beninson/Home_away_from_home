
import { useState, useEffect } from 'react';
import { ChatItem } from './ChatItem';
import { isUpcomingOrActiveChat } from '../../utils/chatUtils';

export function ChatSidebar({ chats = [], loading, activeChat, onSelectChat }) {
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
      <div className="chats-sidebar-header">הצ׳אטים שלי</div>
      <div className="chats-list">
        {loading && chats.length === 0 ? (
          <p className="chats-status-message">טוען צ׳אטים...</p>
        ) : chats.length === 0 ? (
          <p className="chats-status-message">אין שיחות.</p>
        ) : (
          <>
            {activeChats.length === 0 ? (
              <p className="chats-status-message">אין שיחות פעילות.</p>
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
                    היסטוריית צ'אטים ({pastChats.length})
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
