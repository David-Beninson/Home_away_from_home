
import { ChatMessageItem } from './ChatMessageItem';

export function ChatMessageList({ messages, activeChat, currentUserId, messagesEndRef }) {
  return (
    <div className="chat-messages">
      {messages.map((msg, idx) => (
        <ChatMessageItem
          key={msg.id ?? idx}
          msg={msg}
          activeChat={activeChat}
          currentUserId={currentUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
