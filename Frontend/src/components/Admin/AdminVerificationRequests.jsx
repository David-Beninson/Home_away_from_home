import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import PageContainer from '../Common/PageContainer/PageContainer';
import { AdminSupportChatModal } from './AdminSupportChatModal';
import { AdminRejectModal } from './AdminRejectModal';


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
        <div className="admin-success-toast">
          ✓ {successMsg}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="admin-card admin-empty-card">
          <div className="admin-empty-icon">🎉</div>
          <h3>אין בקשות אימות ממתינות בתור</h3>
          <p>כל הבקשות נבדקו ואושרו על ידי צוות המנהלים.</p>
        </div>
      ) : (
        <div className="admin-req-list">
          {requests.map((req) => (
            <div key={req.id} className="admin-card admin-req-card">
              <div className="admin-req-header">
                <div>
                  <h3 className="admin-req-user-name">{req.user_full_name}</h3>
                  <div className="admin-req-user-email">{req.user_email}</div>
                </div>

                <div className="admin-req-badges">
                  <span className="admin-req-type-tag">
                    {getTypeName(req.verification_type)}
                  </span>
                  
                  {req.ai_confidence_score && (
                    <span className="admin-req-ai-tag">
                      AI: {req.ai_confidence_score}%
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-side Image Inspection Grid */}
              <div className={`admin-req-img-grid ${req.secondary_document_url ? 'grid-lone-soldier' : ''}`}>
                <div className="admin-req-img-box">
                  <div className="admin-req-img-title">תמונת סלפי 📸</div>
                  <img
                    src={getFullUrl(req.selfie_url)}
                    alt="Selfie"
                    className="admin-req-img"
                    onError={(e) => {
                      console.error("Failed to load selfie image:", req.selfie_url);
                    }}
                  />
                </div>

                <div className="admin-req-img-box">
                  <div className="admin-req-img-title">תעודת זהות / חוגר 🪪</div>
                  <img
                    src={getFullUrl(req.document_url)}
                    alt="Document"
                    className="admin-req-img"
                    onError={(e) => {
                      console.error("Failed to load document image:", req.document_url);
                    }}
                  />
                </div>

                {req.secondary_document_url && (
                  <div className="admin-req-img-box">
                    <div className="admin-req-img-title">תעודת בודד או עולה חדש 📄</div>
                    <img
                      src={getFullUrl(req.secondary_document_url)}
                      alt="Secondary Document"
                      className="admin-req-img"
                      onError={(e) => {
                        console.error("Failed to load secondary document image:", req.secondary_document_url);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="admin-req-actions">
                <button
                  onClick={() => handleOpenSupportChat(req.user_id, req.user_full_name)}
                  className="admin-req-chat-btn"
                >
                  💬 צ'אט תמיכה
                </button>

                <button
                  onClick={() => setRejectingId(req.id)}
                  disabled={processingId === req.id}
                  className="admin-req-reject-btn"
                >
                  דחה בקשה ❌
                </button>

                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                  className="admin-req-approve-btn"
                >
                  {processingId === req.id ? (
                    <>
                      <span className="admin-btn-spinner" />
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
        <AdminSupportChatModal
          targetUserId={activeChatUser.userId}
          targetUserName={activeChatUser.userName}
          onClose={() => setActiveChatUser(null)}
        />
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <AdminRejectModal
          rejectingId={rejectingId}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          onSubmit={handleRejectSubmit}
          onClose={() => { setRejectingId(null); setRejectionReason(''); }}
          isProcessing={Boolean(processingId)}
        />
      )}

    </PageContainer>
  );
}
