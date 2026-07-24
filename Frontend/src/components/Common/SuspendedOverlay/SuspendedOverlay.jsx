import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, fetchCurrentUser } from '../../../store/authSlice';
import { verificationApi } from '../../../api/api';
import { useSupportChat } from '../../../hooks/useSupportChat';
import './SuspendedOverlay.css';

export default function SuspendedOverlay() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  
  const [verificationType, setVerificationType] = useState('civilian');
  const [selfieFile, setSelfieFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(0); // 0: Idle, 1: Uploading, 2: AI Scanning, 3: Completed
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    messages,
    messageText,
    setMessageText,
    sendMessage,
    messagesEndRef,
    currentUserId,
  } = useSupportChat();

  const status = user?.verification_status || 'pending_submission';

  useEffect(() => {
    verificationApi.getStatus().then((res) => {
      setVerificationDetails(res.data);
    }).catch(() => {});
  }, [user]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'selfie') setSelfieFile(file);
      if (type === 'doc') setDocFile(file);
    }
  };

  const handleSubmitDocuments = async (e) => {
    e.preventDefault();
    if (!selfieFile || !docFile) {
      setErrorMsg('אנא בחר גם תמונת סלפי וגם תמונת תעודה.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    setSubmitStep(1); // Uploading

    try {
      const formData = new FormData();
      formData.append('verification_type', verificationType);
      formData.append('selfie', selfieFile);
      formData.append('document', docFile);

      setTimeout(() => setSubmitStep(2), 1000);

      const res = await verificationApi.submitDocuments(formData);

      setTimeout(() => {
        setSubmitStep(3);
        setIsSubmitting(false);
        setVerificationDetails(res.data);
        dispatch(fetchCurrentUser());
      }, 3000);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitStep(0);
      setErrorMsg(err.response?.data?.detail || 'העלאת המסמכים נכשלה. אנא נסה שוב.');
    }
  };

  return (
    <div className="suspended-overlay">
      {/* Top Bar */}
      <header className="suspended-header">
        <div className="suspended-header-brand">
          <span>🕯️</span>
          <span>Hosting for Shabbat</span>
        </div>

        <button className="logout-btn-overlay" onClick={() => dispatch(logout())}>
          יציאה מהחשבון 🚪
        </button>
      </header>

      {/* Main Content */}
      <div className="suspended-body">
        {/* Status Card */}
        <div className="status-card">
          <div className="status-card-header">
            {status === 'pending_submission' && (
              <div className="status-icon-wrapper info">📋</div>
            )}
            {(status === 'pending_ai' || status === 'pending_admin') && (
              <div className="status-icon-wrapper warning">⏳</div>
            )}
            {status === 'rejected' && (
              <div className="status-icon-wrapper danger">⚠️</div>
            )}
            {status === 'suspended' && (
              <div className="status-icon-wrapper danger">🚫</div>
            )}

            <div>
              <h2 className="status-title">
                {status === 'pending_submission' && 'אימות זהות נדרש לשימוש במערכת'}
                {status === 'pending_ai' && 'סורק מסמכים (בינה מלאכותית)...'}
                {status === 'pending_admin' && 'המסמכים בבדיקת צוות הנהלת המערכת'}
                {status === 'rejected' && 'בקשת האימות נדחתה'}
                {status === 'suspended' && 'חשבונך מושהה מהמערכת'}
              </h2>
              <p className="status-subtitle">
                {status === 'pending_submission' && 'כדי להבטיח את ביטחון הקהילה, אנא העלה סלפי ותעודה לאימות.'}
                {status === 'pending_admin' && 'המסמכים שלך נסרקו בהצלחה והועברו לאישור סופי. תקבל עדכון מנהל בהקדם.'}
                {status === 'rejected' && (verificationDetails?.rejection_reason || 'התמונה לא הייתה קריאה. אנא העלה מסמכים מחדש.')}
                {status === 'suspended' && 'לצערנו חשבונך מושהה מהמערכת. אנא פנו למנהלים דרך הצ\'אט למטה.'}
              </p>
            </div>
          </div>

          {/* Form for pending_submission or rejected */}
          {(status === 'pending_submission' || status === 'rejected') && submitStep === 0 && (
            <form onSubmit={handleSubmitDocuments}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span className="verification-type-label">סוג האימות:</span>
                <div className="verification-type-pills">
                  <button
                    type="button"
                    className={`type-pill-btn ${verificationType === 'civilian' ? 'active' : ''}`}
                    onClick={() => setVerificationType('civilian')}
                  >
                    <span>🏠</span>
                    <span>אזרח / אורח</span>
                  </button>

                  <button
                    type="button"
                    className={`type-pill-btn ${verificationType === 'lone_soldier' ? 'active' : ''}`}
                    onClick={() => setVerificationType('lone_soldier')}
                  >
                    <span>🪖</span>
                    <span>חייל בודד / סדיר</span>
                  </button>

                  <button
                    type="button"
                    className={`type-pill-btn ${verificationType === 'new_immigrant' ? 'active' : ''}`}
                    onClick={() => setVerificationType('new_immigrant')}
                  >
                    <span>✈️</span>
                    <span>עולה חדש</span>
                  </button>
                </div>
              </div>

              <div className="upload-grid">
                <label className="upload-field-box">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} />
                  <div className="upload-icon">📸</div>
                  <div style={{ fontWeight: 600 }}>העלה תמונת סלפי</div>
                  {selfieFile && <div className="file-preview-name">✓ {selfieFile.name}</div>}
                </label>

                <label className="upload-field-box">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'doc')} />
                  <div className="upload-icon">🪪</div>
                  <div style={{ fontWeight: 600 }}>העלה תעודת זהות / חוגר</div>
                  {docFile && <div className="file-preview-name">✓ {docFile.name}</div>}
                </label>
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--spot-full-color)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="submit-verify-btn">
                שלח לבדיקת AI ואישור מנהל 🚀
              </button>
            </form>
          )}

          {/* Progress Animation during submit */}
          {isSubmitting && (
            <div className="ai-steps-container">
              <div className="ai-step-item">
                {submitStep >= 1 ? '✅' : '⏳'} <span>מעלה קבצים לשרת מאובטח...</span>
              </div>
              <div className="ai-step-item">
                {submitStep >= 2 ? <div className="ai-step-spinner" /> : '⏳'} <span>סורק פנים ותעודה (מופעל על ידי בינה מלאכותית)...</span>
              </div>
              <div className="ai-step-item">
                {submitStep >= 3 ? '✅' : '⏳'} <span>מעביר לתור אישור סופי של מנהלי המערכת...</span>
              </div>
            </div>
          )}

          {/* Pending Admin State Info */}
          {status === 'pending_admin' && (
            <div style={{ backgroundColor: 'var(--primary-blue-light)', border: '1px solid var(--primary-blue-border)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-blue)', marginBottom: '0.25rem' }}>
                ציון התאמה וסריקת AI: {verificationDetails?.ai_confidence_score || '85.0'}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                הבקשה שלך נמצאת בראש תור המנהלים. הודעה תישלח ברגע שהפרופיל יאושר.
              </div>
            </div>
          )}
        </div>

        {/* Support Chat Box */}
        <div className="admin-support-box">
          <div className="support-title">
            <span>💬</span>
            <span>צ'אט תמיכה מול הנהלת המערכת</span>
          </div>

          <div className="support-chat-placeholder">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                שלום! אנו כאן לעזור לך בכל שאלה.
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id || Math.random()}
                    style={{
                      marginBottom: '0.75rem',
                      textAlign: isMine ? 'left' : 'right',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '10px',
                        backgroundColor: isMine ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                        color: isMine ? '#ffffff' : 'var(--text-h)',
                        border: isMine ? 'none' : '1px solid var(--border)',
                        maxWidth: '85%',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.content}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="support-input-row">
            <input
              type="text"
              placeholder="כתוב הודעה למנהלים..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="submit" disabled={!messageText.trim()}>שלח ✉️</button>
          </form>
        </div>
      </div>
    </div>
  );
}
