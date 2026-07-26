
import { ChatItem } from './ChatItem';

export function ChatSidebar({ chats, loading, activeChat, onSelectChat }) {
  return (
    <div className="chats-sidebar">
      <div className="chats-sidebar-header">הצ׳אטים שלי</div>
      <div className="chats-list">
        {loading && chats.length === 0 ? (
          <p className="chats-status-message">טוען צ׳אטים...</p>
        ) : chats.length === 0 ? (
          <p className="chats-status-message">אין שיחות פעילות.</p>
        ) : (
          chats.map(chat => (
            <ChatItem
              key={chat.match_id}
              chat={chat}
              isActive={activeChat?.match_id === chat.match_id}
              onSelectChat={onSelectChat}
            />
          ))
        )}
      </div>
    </div>
  );
}
