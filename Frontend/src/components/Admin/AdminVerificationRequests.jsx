import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api';
import PageContainer from '../Common/PageContainer/PageContainer';
import { AdminSupportChatModal } from './AdminSupportChatModal';
import { AdminRejectModal } from './AdminRejectModal';
import { useTranslation } from 'react-i18next';
import { useAdminAction } from '../../hooks/useAdminAction';

export default function AdminVerificationRequests() {
  const { t } = useTranslation(['admin/verifications']);
  const [requests, setRequests] = useState([]);
  const { loading, error, successMsg, executeAction, setError } = useAdminAction();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeChatUser, setActiveChatUser] = useState(null); // { userId, userName }

  const loadRequests = () => {
    executeAction(
      () => adminApi.getPendingVerifications(),
      (res) => setRequests(res.data || []),
      null,
      t('admin/verifications:messages.error_loading')
    );
  };

  useEffect(() => {
    loadRequests();
  }, [executeAction, t]);

  const [processingId, setProcessingId] = useState(null);

  const handleOpenSupportChat = (userId, userName) => {
    setActiveChatUser({ userId, userName });
  };

  const handleApprove = (id) => {
    if (processingId) return;
    setProcessingId(id);
    
    executeAction(
      () => adminApi.approveVerification(id),
      () => {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setProcessingId(null);
      },
      t('admin/verifications:messages.success_approve'),
      t('admin/verifications:messages.error_approve')
    ).then((success) => {
      if (!success) setProcessingId(null);
    });
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectingId || !rejectionReason.trim() || processingId) return;

    setProcessingId(rejectingId);
    
    executeAction(
      () => adminApi.rejectVerification(rejectingId, rejectionReason.trim()),
      () => {
        setRequests((prev) => prev.filter((r) => r.id !== rejectingId));
        setRejectingId(null);
        setRejectionReason('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setProcessingId(null);
      },
      t('admin/verifications:messages.success_reject'),
      t('admin/verifications:messages.error_reject')
    ).then((success) => {
      if (!success) setProcessingId(null);
    });
  };

  const getTypeName = (type) => {
    if (type === 'lone_soldier') return t('admin/verifications:types.lone_soldier');
    return t('admin/verifications:types.host');
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
        <h2 className="admin-page-title">{t('admin/verifications:title')}</h2>
        <p className="admin-page-subtitle">{t('admin/verifications:subtitle')}</p>
      </div>

      {successMsg && (
        <div className="admin-success-toast">
          ✓ {successMsg}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="admin-card admin-empty-card">
          <div className="admin-empty-icon">🎉</div>
          <h3>{t('admin/verifications:empty_state.title')}</h3>
          <p>{t('admin/verifications:empty_state.desc')}</p>
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
                  <div className="admin-req-img-title">{t('admin/verifications:images.selfie')}</div>
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
                  <div className="admin-req-img-title">{t('admin/verifications:images.document')}</div>
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
                    <div className="admin-req-img-title">{t('admin/verifications:images.secondary')}</div>
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
                  {t('admin/verifications:actions.support_chat')}
                </button>

                <button
                  onClick={() => setRejectingId(req.id)}
                  disabled={processingId === req.id}
                  className="admin-req-reject-btn"
                >
                  {t('admin/verifications:actions.reject')}
                </button>

                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                  className="admin-req-approve-btn"
                >
                  {processingId === req.id ? (
                    <>
                      <span className="admin-btn-spinner" />
                      <span>{t('admin/verifications:actions.approving')}</span>
                    </>
                  ) : (
                    <span>{t('admin/verifications:actions.approve')}</span>
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
