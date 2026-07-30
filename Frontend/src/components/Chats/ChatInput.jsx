import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Send, Sparkles, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../api/api';
import { MessageInput } from '../Common/MessageInput';

export function ChatInput({ messageText, setMessageText, sendMessage, activeChat, messages = [] }) {
  const { t } = useTranslation(['chat/chats']);
  const currentUser = useSelector((state) => state.auth.user);
  const userRole = currentUser?.user_type || 'guest';
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = () => {
    if (!activeChat?.match_id) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.post('/agent/suggest-reply', { match_id: activeChat.match_id })
      .then(res => {
        setSuggestions(res.data?.suggestions || []);
      })
      .catch(() => {
        setSuggestions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSuggestions();
  }, [activeChat?.match_id, messages.length]);

  const handleQuickClick = (text) => {
    setMessageText(text);
  };

  const chatStatus = activeChat?.status || activeChat?.matchStatus || 'matched';
  const isApproved = ['approved', 'matched', 'confirmed', 'accepted'].includes(String(chatStatus).toLowerCase());

  if (!isApproved) {
    return (
      <div className="chat-input-wrapper">
        <div className="chat-input-disabled-banner">
          {t('chat/chats:input.disabled_banner')}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-input-wrapper">
      {loading ? (
        <div className="chat-icebreakers-wrapper">
          <div className="chat-icebreakers-list scrollbar-none">
            <div className="chat-icebreaker-loading-pill">
              <Sparkles size={13} className="icebreaker-sparkle" />
              <span>{t('chat/chats:input.ai_analyzing')}</span>
              <span className="chat-typing-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          </div>
        </div>
      ) : suggestions.length > 0 && (
        <div className="chat-icebreakers-wrapper">
          <div className="chat-icebreakers-header">
            <span className="chat-ai-badge">
              <Sparkles size={12} />
              <span>{t('chat/chats:input.ai_suggestions_title')}</span>
            </span>
            <button 
              type="button" 
              className="chat-ai-refresh-btn" 
              onClick={fetchSuggestions}
              title={t('chat/chats:input.btn_refresh_ai')}
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="chat-icebreakers-list scrollbar-none">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                className="chat-icebreaker-pill"
                onClick={() => handleQuickClick(suggestion)}
                title={t('chat/chats:input.btn_suggestion_tooltip')}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      <MessageInput
        value={messageText}
        onChange={setMessageText}
        onSendMessage={sendMessage}
        placeholder={t('chat/chats:input.placeholder')}
      />
    </div>
  );
}



