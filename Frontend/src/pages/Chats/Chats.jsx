
import { useChatList } from '../../hooks/useChatList';
import { useChatMessages } from '../../hooks/useChatMessages';
import { ChatSidebar } from '../../components/Chats/ChatSidebar';
import { ChatHeader } from '../../components/Chats/ChatHeader';
import { ChatMessageList } from '../../components/Chats/ChatMessageList';
import { ChatInput } from '../../components/Chats/ChatInput';
import { ChatEmptyState } from '../../components/Chats/ChatEmptyState';
import './Chats.css';

export default function Chats() {
  const { chats, loading, activeChat, handleSelectChat } = useChatList();
  const {
    messages,
    messageText,
    setMessageText,
    sendMessage,
    messagesEndRef,
    user,
  } = useChatMessages(activeChat);

  return (
    <div className="chats-container">
      {/* Sidebar - Chats List */}
      <ChatSidebar
        chats={chats}
        loading={loading}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
      />

      {/* Main Chat Area */}
      <div className="chat-main">
        {!activeChat ? (
          <ChatEmptyState />
        ) : (
          <>
            {/* Chat Header */}
            <ChatHeader 
              activeChat={activeChat} 
            />

            {/* Chat Messages */}
            <ChatMessageList
              messages={messages}
              activeChat={activeChat}
              currentUserId={user?.id}
              messagesEndRef={messagesEndRef}
            />

            {/* Chat Input */}
            <ChatInput
              messageText={messageText}
              setMessageText={setMessageText}
              sendMessage={sendMessage}
              activeChat={activeChat}
            />
          </>
        )}
      </div>
    </div>
  );
}
