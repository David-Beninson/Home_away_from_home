import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import PageContainer from '../Common/PageContainer/PageContainer';
import { ChatMessageList } from '../Chats/ChatMessageList';
import { ChatInput } from '../Chats/ChatInput';
import { useSupportChat } from '../../hooks/useSupportChat';
import { X, User } from 'lucide-react';
import '../../pages/Chats/Chats.css';
import '../../pages/Admin/Admin.css';

// Sub-component wrapper using existing chat components and live WebSocket hook
function AdminSupportChatWindow({ targetUserId, targetUserName, onClose }) {
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '680px', height: '80vh', maxHeight: '700px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card, #ffffff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
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
            <button onClick={onClose} style={{ border: 'none', background: 'var(--secondary, #f3f4f6)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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

export default function AdminVerificationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeChatUser, setActiveChatUser] = useState(null); // { userId, userName }

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getPendingVerifications();
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load pending verifications:', err);
      setError('שגיאה בטעינת בקשות אימות ממתינות.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const [processingId, setProcessingId] = useState(null);

  const handleOpenSupportChat = (userId, userName) => {
    setActiveChatUser({ userId, userName });
  };

  const handleApprove = async (id) => {
    if (processingId) return;
    try {
      setError('');
      setSuccessMsg('');
      setProcessingId(id);
      await adminApi.approveVerification(id);
      setSuccessMsg('✓ בקשת האימות אושרה בהצלחה והמשתמש הועבר לסטטוס מאושר!');
      setRequests((prev) => prev.filter((r) => r.id !== id));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to approve verification:', err);
      setError('אישור הבקשה נכשל.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingId || !rejectionReason.trim() || processingId) return;

    try {
      setError('');
      setSuccessMsg('');
      setProcessingId(rejectingId);
      await adminApi.rejectVerification(rejectingId, rejectionReason.trim());
      setSuccessMsg('✓ הבקשה נדחתה בהצלחה והודעה נשלחה למשתמש.');
      setRequests((prev) => prev.filter((r) => r.id !== rejectingId));
      setRejectingId(null);
      setRejectionReason('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to reject verification:', err);
      setError('דחיית הבקשה נכשלה.');
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeName = (type) => {
    if (type === 'lone_soldier') return 'משרת בודד/ה';
    return '🏠 מארח';
  };

  const token = localStorage.getItem('token') || '';
  const getFullUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    baseUrl = baseUrl.replace(/\/+$/, '');
    const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    
    // Handle if baseUrl already ends with /api and cleanPath starts with /api
    let full = '';
    if (baseUrl.endsWith('/api') && cleanPath.startsWith('/api')) {
      full = baseUrl + cleanPath.replace('/api', '');
    } else {
      full = baseUrl + cleanPath;
    }
    return `${full}?token=${token}`;
  };

  return (
    <PageContainer loading={loading} error={error}>
      <div className="admin-page-header">
        <h2 className="admin-page-title">תור בקשות אימות וסינון (Moderation Queue)</h2>
        <p className="admin-page-subtitle">סקירת מסמכים, ניתוח AI ואישור/דחייה של משתמשים חדשים במערכת</p>
      </div>

      {successMsg && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--match-high-bg)', border: '1px solid var(--match-high-border)', color: 'var(--match-high-color)', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
          <h3>אין בקשות אימות ממתינות בתור</h3>
          <p>כל הבקשות נבדקו ואושרו על ידי צוות המנהלים.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {requests.map((req) => (
            <div key={req.id} className="admin-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-h)' }}>{req.user_full_name}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{req.user_email}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {getTypeName(req.verification_type)}
                  </span>
                  
                  {req.ai_confidence_score && (
                    <span style={{ padding: '0.35rem 0.85rem', borderRadius: '20px', backgroundColor: 'var(--match-high-bg)', border: '1px solid var(--match-high-border)', color: 'var(--match-high-color)', fontSize: '0.85rem', fontWeight: 700 }}>
                      AI: {req.ai_confidence_score}%
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-side Image Inspection Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: req.secondary_document_url ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr 1fr', gap: '1rem', margin: '1.25rem 0' }}>
                <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-h)', fontSize: '0.9rem' }}>תמונת סלפי 📸</div>
                  <img
                    src={getFullUrl(req.selfie_url)}
                    alt="Selfie"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '8px' }}
                    onError={(e) => {
                      console.error("Failed to load selfie image:", req.selfie_url);
                    }}
                  />
                </div>

                <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-h)', fontSize: '0.9rem' }}>תעודת זהות / חוגר 🪪</div>
                  <img
                    src={getFullUrl(req.document_url)}
                    alt="Document"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '8px' }}
                    onError={(e) => {
                      console.error("Failed to load document image:", req.document_url);
                    }}
                  />
                </div>

                {req.secondary_document_url && (
                  <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-h)', fontSize: '0.9rem' }}>תעודת בודד או עולה חדש 📄</div>
                    <img
                      src={getFullUrl(req.secondary_document_url)}
                      alt="Secondary Document"
                      style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '8px' }}
                      onError={(e) => {
                        console.error("Failed to load secondary document image:", req.secondary_document_url);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={() => handleOpenSupportChat(req.user_id, req.user_full_name)}
                  style={{
                    backgroundColor: 'var(--primary-blue-light)',
                    color: 'var(--primary-blue)',
                    border: '1px solid var(--primary-blue-light)',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  💬 צ'אט תמיכה
                </button>

                <button
                  onClick={() => setRejectingId(req.id)}
                  disabled={processingId === req.id}
                  style={{
                    backgroundColor: 'var(--spot-full-bg)',
                    color: 'var(--spot-full-color)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                    opacity: processingId === req.id ? 0.6 : 1
                  }}
                >
                  דחה בקשה ❌
                </button>

                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                  style={{
                    backgroundColor: processingId === req.id ? '#15803d' : 'var(--match-high-color)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: processingId === req.id ? 0.8 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {processingId === req.id ? (
                    <>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>מאשר בקשה...</span>
                    </>
                  ) : (
                    <span>אישור והפעלת חשבון ✓</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Support Chat Modal for Admin */}
      {activeChatUser && (
        <AdminSupportChatWindow
          targetUserId={activeChatUser.userId}
          targetUserName={activeChatUser.userName}
          onClose={() => setActiveChatUser(null)}
        />
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem', width: '90%', maxWidth: '480px', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-h)' }}>דחיית בקשת אימות</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              אנא ציין את סיבת הדחייה שתופיע למשתמש במסך הנעילה (למשל: "התמונה מטושטשת", "תעודה לא קריאה"):
            </p>

            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="רשום את נימוק הדחייה..."
                required
                style={{
                  width: '100%',
                  minHeight: '90px',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-h)',
                  fontFamily: 'var(--sans)',
                  marginBottom: '1.25rem'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                  disabled={Boolean(processingId)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
                >
                  ביטול
                </button>

                <button
                  type="submit"
                  disabled={Boolean(processingId)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: processingId ? '#9ca3af' : 'var(--spot-full-color)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: processingId ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {processingId === rejectingId ? 'שולח דחייה... ⏳' : 'שלח דחייה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
