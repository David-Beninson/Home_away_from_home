import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, fetchCurrentUser } from '../../../store/authSlice';
import { verificationApi } from '../../../api/api';
import { useSupportChat } from '../../../hooks/useSupportChat';
import { useTranslation } from 'react-i18next';
import './SuspendedOverlay.css';

export default function SuspendedOverlay() {
  const { t } = useTranslation(['common/suspended']);
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [verificationType, setVerificationType] = useState(() => (user?.user_type === 'host' ? 'civilian' : 'lone_soldier'));
  const [selfieFile, setSelfieFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [secondaryDocFile, setSecondaryDocFile] = useState(null);
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

  const accountStatus = user?.account_status;
  const statusReason = user?.status_reason;
  const isSuspended = accountStatus && String(accountStatus).toLowerCase() === 'suspended';
  const status = isSuspended ? 'suspended' : (user?.verification_status || 'pending_submission');

  useEffect(() => {
    if (user?.user_type === 'host') {
      setVerificationType('civilian');
    } else if (user?.user_type === 'guest') {
      setVerificationType('lone_soldier');
    }
  }, [user?.user_type]);

  useEffect(() => {
    verificationApi.getStatus().then((res) => {
      setVerificationDetails(res.data);
    }).catch(() => { });

    const handleStatusChange = (e) => {
      verificationApi.getStatus().then((res) => {
        setVerificationDetails(res.data);
      }).catch(() => { });
    };

    window.addEventListener('verification_status_changed', handleStatusChange);
    return () => window.removeEventListener('verification_status_changed', handleStatusChange);
  }, [user]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'selfie') setSelfieFile(file);
      if (type === 'doc') setDocFile(file);
      if (type === 'secondary_doc') setSecondaryDocFile(file);
    }
  };

  const handleSubmitDocuments = async (e) => {
    e.preventDefault();
    if (!selfieFile || !docFile) {
      setErrorMsg(t('common/suspended:errors.missing_files'));
      return;
    }

    if (verificationType === 'lone_soldier' && !secondaryDocFile) {
      setErrorMsg(t('common/suspended:errors.missing_secondary'));
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
      if (secondaryDocFile) {
        formData.append('secondary_document', secondaryDocFile);
      }

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
      const { data } = err.response || {};
      // Avoid rendering raw objects/arrays in JSX which throws React errors
      const formatted = (data && data.detail) ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg || JSON.stringify(d)).join(', ') : (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))) : null;
      setErrorMsg(formatted || t('common/suspended:errors.upload_failed'));
    }
  };

  return (
    <div className="suspended-overlay">
      {/* Top Bar */}
      <header className="suspended-header">
        <div className="suspended-header-brand">
          <span>🕯️</span>
          <span>Home Away From Home</span>
        </div>

        <button className="logout-btn-overlay" onClick={() => dispatch(logout())}>
          {t('common/suspended:header.logout')}
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
                {status === 'pending_submission' && t('common/suspended:status_titles.pending_submission')}
                {status === 'pending_ai' && t('common/suspended:status_titles.pending_ai')}
                {status === 'pending_admin' && t('common/suspended:status_titles.pending_admin')}
                {status === 'rejected' && t('common/suspended:status_titles.rejected')}
                {status === 'suspended' && t('common/suspended:status_titles.suspended')}
              </h2>
              <div className="status-subtitle">
                {status === 'pending_submission' && t('common/suspended:status_subtitles.pending_submission')}
                {status === 'pending_admin' && t('common/suspended:status_subtitles.pending_admin')}
                {status === 'rejected' && (verificationDetails?.rejection_reason || t('common/suspended:status_subtitles.default_rejection'))}
                {status === 'suspended' && (
                  <>
                    {t('common/suspended:status_subtitles.suspended_desc')}
                    {statusReason && (
                      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '5px', fontWeight: 'bold' }}>
                        {t('common/suspended:status_subtitles.suspension_reason')}{statusReason}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form for pending_submission or rejected */}
          {(status === 'pending_submission' || status === 'rejected') && submitStep === 0 && (
            <form onSubmit={handleSubmitDocuments}>
              <div className="verify-type-section">
                <span className="verification-type-label">{t('common/suspended:form.type_label')}</span>
                <div className="verify-type-options">
                  {user?.user_type === 'host' ? (
                    <div className="verify-type-badge">
                      <span>🏠</span>
                      <span>{t('common/suspended:form.host_type')}</span>
                    </div>
                  ) : (
                    <div className="verify-type-badge">
                      <span>🪖</span>
                      <span>{t('common/suspended:form.guest_type')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`upload-grid ${verificationType === 'lone_soldier' ? 'grid-lone-soldier' : 'grid-default'}`}>
                <label className="upload-field-box">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} />
                  <div className="upload-icon">📸</div>
                  <div className="upload-field-title">
                    {verificationType === 'civilian' ? t('common/suspended:form.selfie_host') : t('common/suspended:form.selfie_guest')}
                  </div>
                  {selfieFile && <div className="file-preview-name">✓ {selfieFile.name}</div>}
                </label>

                <label className="upload-field-box">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'doc')} />
                  <div className="upload-icon">🪪</div>
                  <div className="upload-field-title">
                    {verificationType === 'civilian' ? t('common/suspended:form.id_host') : t('common/suspended:form.id_guest')}
                  </div>
                  {docFile && <div className="file-preview-name">✓ {docFile.name}</div>}
                </label>

                {verificationType === 'lone_soldier' && (
                  <label className="upload-field-box">
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'secondary_doc')} />
                    <div className="upload-icon">📄</div>
                    <div className="upload-field-title">{t('common/suspended:form.secondary_doc')}</div>
                    {secondaryDocFile && <div className="file-preview-name">✓ {secondaryDocFile.name}</div>}
                  </label>
                )}
              </div>

              {errorMsg && (
                <div className="verify-error-msg">
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="submit-verify-btn">
                {t('common/suspended:form.submit')}
              </button>
            </form>
          )}

          {/* Progress Animation during submit */}
          {isSubmitting && (
            <div className="ai-steps-container">
              <div className="ai-step-item">
                {submitStep >= 1 ? '✅' : '⏳'} <span>{t('common/suspended:ai_progress.uploading')}</span>
              </div>
              <div className="ai-step-item">
                {submitStep >= 2 ? <div className="ai-step-spinner" /> : '⏳'} <span>{t('common/suspended:ai_progress.scanning')}</span>
              </div>
              <div className="ai-step-item">
                {submitStep >= 3 ? '✅' : '⏳'} <span>{t('common/suspended:ai_progress.queueing')}</span>
              </div>
            </div>
          )}

          {/* Pending Admin State Info */}
          {status === 'pending_admin' && (
            <div className="pending-admin-info-card">
              <div className="pending-admin-info-title">
                {t('common/suspended:admin_stats.ai_score', { score: verificationDetails?.ai_confidence_score || '85.0' })}
              </div>
              <div className="pending-admin-info-desc">
                {t('common/suspended:admin_stats.queue_msg')}
              </div>
            </div>
          )}
        </div>

        {/* Support Chat Box */}
        <div className="admin-support-box">
          <div className="support-title">
            <span>💬</span>
            <span>{t('common/suspended:chat.title')}</span>
          </div>

          <div className="support-chat-placeholder">
            {messages.length === 0 ? (
              <div className="support-empty-state">
                {t('common/suspended:chat.empty')}
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id || Math.random()}
                    className={`support-msg-container ${isMine ? 'mine' : 'other'}`}
                  >
                    <span className={`support-msg-bubble ${isMine ? 'mine' : 'other'}`}>
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
              placeholder={t('common/suspended:chat.placeholder')}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="submit" disabled={!messageText.trim()}>{t('common/suspended:chat.send')}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
