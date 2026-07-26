

export function ChatItem({ chat, isActive, onSelectChat }) {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelectChat(chat)}
    >
      <div className="chat-item-content">
        <div className="chat-item-avatar">
          {chat.other_party_name?.charAt(0) || 'א'}
        </div>
        <div className="chat-item-info">
          <div className="chat-item-top">
            <h3 className="chat-item-name">{chat.other_party_name}</h3>
            {chat.last_message_time && (
              <span className="chat-item-time">
                {formatTime(chat.last_message_time)}
              </span>
            )}
          </div>
          <div className="chat-item-bottom">
            <p className="chat-item-preview">{chat.last_message || 'אין הודעות עדיין'}</p>
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
