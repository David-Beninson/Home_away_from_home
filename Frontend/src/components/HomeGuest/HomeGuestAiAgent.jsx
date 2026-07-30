import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Check, Bot, Loader2 } from 'lucide-react';
import { BRAND_TITLE } from '../../config/brand';
import { agentApi } from '../../api/api';
import { useTranslation } from 'react-i18next';

export default function HomeGuestAiAgent() {
  const { t } = useTranslation(['guest/home']);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: t('guest/home:agent.welcome_msg', { brand: BRAND_TITLE }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query || !query.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const res = await agentApi.chat(query.trim());
      const agentReply = res.data?.response || t('guest/home:agent.error_no_reply');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: agentReply,
        },
      ]);
    } catch (err) {
      console.error('AI agent chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: t('guest/home:agent.error_connection'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    t('guest/home:agent.suggestions.kosher'),
    t('guest/home:agent.suggestions.tel_aviv'),
    t('guest/home:agent.suggestions.request'),
    t('guest/home:agent.suggestions.arrive'),
  ];

  return (
    <section className="gh-ai-section">
      <div className="gh-section-header">
        <h3>{t('guest/home:agent.title')}</h3>
        <span className="gh-badge-new">
          <Sparkles size={14} /> {t('guest/home:agent.new_badge')}
        </span>
      </div>

      <div className="gh-ai-grid">
        {/* AI Chat Window (Right Side) */}
        <div className="gh-ai-chat">
          <div className="gh-chat-header">
            <div className="gh-chat-agent-info">
              <div className="gh-agent-avatar">
                <Bot size={20} />
              </div>
              <div>
                <h4>{t('guest/home:agent.header_title', { brand: BRAND_TITLE })}</h4>
                <p>
                  {t('guest/home:agent.header_subtitle')} <span className="gh-online-dot"></span> {t('guest/home:agent.status_online')}
                </p>
              </div>
            </div>
          </div>

          <div className="gh-chat-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`gh-chat-message ${msg.sender === 'user' ? 'user' : ''}`}
              >
                {msg.sender === 'agent' && (
                  <div className="gh-agent-avatar-small">
                    <Bot size={16} />
                  </div>
                )}
                <div className="gh-message-bubble" style={{ whitespace: 'pre-line' }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="gh-chat-message">
                <div className="gh-agent-avatar-small">
                  <Bot size={16} />
                </div>
                <div className="gh-message-bubble gh-loading-bubble">
                  <span>{t('guest/home:agent.loading_text')}</span>
                  <span className="gh-typing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              </div>
            )}

            {!loading && messages.length <= 2 && (
              <div className="gh-chat-suggestions">
                {suggestions.map((suggestion, idx) => (
                  <button key={idx} onClick={() => handleSend(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="gh-chat-input-area">
            <div className="gh-input-wrapper">
              <button
                className="gh-send-btn"
                onClick={() => handleSend()}
                disabled={loading || !inputText.trim()}
                style={{
                  backgroundColor: inputText.trim() && !loading ? '#2563eb' : '#94a3b8',
                  cursor: inputText.trim() && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
              <input
                type="text"
                placeholder={t('guest/home:agent.input_placeholder')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* AI Capabilities (Left Side) */}
        <div className="gh-ai-features">
          <div className="gh-features-icon">
            <Sparkles size={24} color="#2563eb" />
          </div>
          <h4>{t('guest/home:agent.features_title')}</h4>
          <ul className="gh-features-list">
            <li>
              <Check size={16} className="gh-check" /> {t('guest/home:agent.features.match')}
            </li>
            <li>
              <Check size={16} className="gh-check" /> {t('guest/home:agent.features.kosher')}
            </li>
            <li>
              <Check size={16} className="gh-check" /> {t('guest/home:agent.features.board')}
            </li>
            <li>
              <Check size={16} className="gh-check" /> {t('guest/home:agent.features.areas')}
            </li>
            <li>
              <Check size={16} className="gh-check" /> {t('guest/home:agent.features.general')}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
