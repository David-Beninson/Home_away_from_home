import { X, User } from 'lucide-react';
import { ChatMessageList } from '../Chats/ChatMessageList';
import { ChatInput } from '../Chats/ChatInput';
import { useSupportChat } from '../../hooks/useSupportChat';

export function AdminSupportChatModal({ targetUserId, targetUserName, onClose }) {
  const {
    messages,
    messageText,
    setMessageText,
    sendMessage,
    messagesEndRef,
    currentUserId,
  } = useSupportChat(targetUserId);

  const activeChat = {
    other_party_name: targetUserName
  };

  return (
    <div className="admin-chat-modal-overlay">
      <div className="admin-chat-modal-box">
        <div className="chat-header">
          <div className="chat-header-user">
            <div className="chat-header-avatar">
              <User size={20} />
            </div>
            <div>
              <h3 className="chat-header-title">צ'אט תמיכה: {targetUserName}</h3>
              <div className="chat-header-date">תקשורת בזמן אמת מול המשתמש במסך החסימה</div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button onClick={onClose} className="admin-chat-close-btn">
              <X size={20} />
            </button>
          </div>
        </div>

        <ChatMessageList
          messages={messages}
          activeChat={activeChat}
          currentUserId={currentUserId}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          messageText={messageText}
          setMessageText={setMessageText}
          sendMessage={sendMessage}
          activeChat={activeChat}
        />
      </div>
    </div>
  );
}
