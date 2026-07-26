

export function ChatMessageItem({ msg, activeChat, currentUserId }) {
  const isMine = msg.sender_id === currentUserId;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`message-row ${isMine ? 'mine' : 'other'}`}>
      {!isMine && (
        <div className="message-avatar">
          {activeChat.other_party_name?.charAt(0)}
        </div>
      )}
      <div className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
        <p>{msg.content}</p>
        <p className="message-time">
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}
