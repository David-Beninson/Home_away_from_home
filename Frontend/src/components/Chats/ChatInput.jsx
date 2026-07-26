
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import api from '../../api/api';

export function ChatInput({ messageText, setMessageText, sendMessage, activeChat }) {
  const currentUser = useSelector((state) => state.auth.user);
  const userRole = currentUser?.user_type || 'guest';
  const [icebreakers, setIcebreakers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeChat?.match_id) {
      setIcebreakers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get(`/agent/icebreakers?match_id=${activeChat.match_id}`)
      .then(res => {
        setIcebreakers(res.data?.icebreakers || []);
      })
      .catch(() => {
        setIcebreakers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeChat?.match_id]);

  const handleQuickClick = (text) => {
    setMessageText(text);
  };

  return (
    <div className="chat-input-wrapper">
      {loading ? (
        <div className="chat-icebreakers-wrapper">
          <div className="chat-icebreakers-list scrollbar-none">
            <div className="chat-icebreaker-loading-pill">
              <Sparkles size={13} className="icebreaker-sparkle animate-pulse" />
              <span>ה-AI מכין עבורך שאלות תיאום...</span>
              <Loader2 size={12} className="spin-icon" />
            </div>
          </div>
        </div>
      ) : icebreakers.length > 0 && (
        <div className="chat-icebreakers-wrapper">
          <div className="chat-icebreakers-list scrollbar-none">
            {icebreakers.map((question, idx) => (
              <button
                key={idx}
                type="button"
                className="chat-icebreaker-pill"
                onClick={() => handleQuickClick(question)}
                title="לחץ לבחירת השאלה"
              >
                {question}
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


