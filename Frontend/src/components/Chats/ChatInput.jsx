
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Send, Sparkles, RefreshCw } from 'lucide-react';
import api from '../../api/api';

export function ChatInput({ messageText, setMessageText, sendMessage, activeChat, messages = [] }) {
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
          הצ'אט יתאפשר רק לאחר אישור האירוח
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
              <span>הAI שלנו מנתח את שיחת הצ'אט</span>
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
              <span>הצעות לשיחה </span>
            </span>
            <button 
              type="button" 
              className="chat-ai-refresh-btn" 
              onClick={fetchSuggestions}
              title="רענן הצעות AI"
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
                title="לחץ לבחירת הצעת התשובה"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          placeholder="הקלד הודעה..."
          className="chat-input"
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          type="submit"
          disabled={!messageText.trim()}
          className="chat-send-btn"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
}



