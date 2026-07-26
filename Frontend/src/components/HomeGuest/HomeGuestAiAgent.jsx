
import { Sparkles, Send, Check, Bot } from 'lucide-react';

export default function HomeGuestAiAgent() {
  return (
    <section className="gh-ai-section">
      <div className="gh-section-header">
        <h3>שאל את הסוכן החכם</h3>
        <span className="gh-badge-new">
          <Sparkles size={14} /> AI · חדש
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
                <h4>עוזר חכם - שבת שלום</h4>
                <p>
                  מענה מיידי לכל שאלה <span className="gh-online-dot"></span> פעיל
                </p>
              </div>
            </div>
          </div>

          <div className="gh-chat-body">
            <div className="gh-chat-message">
              <div className="gh-agent-avatar-small">
                <Bot size={16} />
              </div>
              <div className="gh-message-bubble">
                שלום! אני העוזר החכם של שבת שלום 👋<br />
                אני יכול לעזור למצוא מארח, להסביר ציוני התאמה, ולענות על כל שאלה. במה אוכל לעזור?
              </div>
            </div>

            <div className="gh-chat-suggestions">
              <button>מה ההבדל בין כשר למהדרין?</button>
              <button>יש מארחים בתל אביב עם לינה?</button>
              <button>איך שולחים בקשת אירוח?</button>
              <button>מתי צריך להגיע לשבת?</button>
            </div>
          </div>

          <div className="gh-chat-input-area">
            <div className="gh-input-wrapper">
              <button className="gh-send-btn">
                <Send size={18} />
              </button>
              <input type="text" placeholder="שאל אותי כל שאלה על אירוח שבת..." />
            </div>
          </div>
        </div>

        {/* AI Capabilities (Left Side) */}
        <div className="gh-ai-features">
          <div className="gh-features-icon">
            <Sparkles size={24} color="#2563eb" />
          </div>
          <h4>מה הסוכן יכול לעשות?</h4>
          <ul className="gh-features-list">
            <li>
              <Check size={16} className="gh-check" /> לעזור לך לבחור מארח לפי ציון ההתאמה
            </li>
            <li>
              <Check size={16} className="gh-check" /> לענות על שאלות כשרות ולינה
            </li>
            <li>
              <Check size={16} className="gh-check" /> להסביר איך עובד לוח הבקשות
            </li>
            <li>
              <Check size={16} className="gh-check" /> לתת מידע על אזורים בארץ
            </li>
            <li>
              <Check size={16} className="gh-check" /> לענות על שאלות כלליות על שבת
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
