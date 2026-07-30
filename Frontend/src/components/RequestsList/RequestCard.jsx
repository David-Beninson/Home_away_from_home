import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Users, Heart, Edit3, Loader2, AlertCircle, Clock, Check, MessageSquare, ExternalLink, Star, XCircle } from 'lucide-react';
import { formatHebrewDate, getRelativeTimeHebrew, checkPostUrgency } from '../../utils/date';
import RequestInlineEdit from './RequestInlineEdit';
import PendingOfferBox from './PendingOfferBox';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';
import ReviewsListModal from '../Reviews/ReviewsListModal';
import { postsApi } from '../../api/api';
import { useTranslation } from 'react-i18next';

export default function RequestCard({ post, userRole, onAction, isClaiming, onUpdateSuccess }) {
  const { t } = useTranslation(['guest/requests']);
  const navigate = useNavigate();
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (post.status === 'matched' || post.status === 'approved') {
      if (!window.confirm(t('guest/requests:card.cancel_confirm_matched'))) {
        return;
      }
    } else {
      if (!window.confirm(t('guest/requests:card.cancel_confirm_open'))) {
        return;
      }
    }
    
    try {
      setIsCancelling(true);
      await postsApi.cancelPost(post.id);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      console.error('Failed to cancel post:', err);
      alert(t('guest/requests:card.error_cancel'));
    } finally {
      setIsCancelling(false);
    }
  };

  // Determine displayed name
  const isAnon = post.is_anonymous || post.guest_name === 'Soldier' || post.guest_name === 'Anonymous Guest' || post.guest_name === 'אנונימי' || post.guest_name === 'חייל אנונימי' || post.guest_name === 'אורח אנונימי';
  const displayName = isAnon ? t('guest/requests:card.anon_name') : (post.guest_name || t('guest/requests:card.default_guest'));

  const unit = post.unit_name || post.service_type || t('guest/requests:card.default_unit');
  const displayRegion = post.region || t('guest/requests:card.default_region');
  const dateFormatted = formatHebrewDate(post.requested_date);
  const subtitle = `${unit} · ${displayRegion} · ${dateFormatted}`;

  // Time details
  const timeAgo = getRelativeTimeHebrew(post.created_at);

  // Status & Urgency mapping
  const isUnapproved = post.status !== 'matched' && post.status !== 'approved';
  const { isUrgent, hoursLeft } = checkPostUrgency(post.requested_date);
  const showUrgentNotice = isUnapproved && isUrgent;
  const isDirectRequest = Boolean(post.is_direct_request);

  let statusLabel = t('guest/requests:card.status_open');
  if (post.status === 'matched' || post.status === 'approved') {
    statusLabel = t('guest/requests:card.status_approved');
  } else if (post.status === 'pending') {
    if (isDirectRequest) {
      statusLabel = userRole === 'host' ? t('guest/requests:card.status_pending_host_approval') : t('guest/requests:card.status_pending_host_response');
    } else {
      statusLabel = userRole === 'guest' ? t('guest/requests:card.status_pending_guest_approval') : t('guest/requests:card.status_pending_guest_response');
    }
  } else if (post.status === 'cancelled' || post.status === 'CANCELLED') {
    statusLabel = t('guest/requests:card.status_cancelled');
  }

  if (isEditingInline) {
    return (
      <RequestInlineEdit
        post={post}
        onCancel={() => setIsEditingInline(false)}
        onSaveSuccess={() => {
          setIsEditingInline(false);
          if (onUpdateSuccess) onUpdateSuccess();
        }}
      />
    );
  }

  const matchId = post.match_id || post.pending_match_id || post.id;
  const otherPartyName = userRole === 'guest' 
    ? (post.claimed_by_host_name || post.host_name || t('guest/requests:card.about_host'))
    : displayName;
  const hostingDate = post.requested_date || post.start_date;
  const reviewTargetId = userRole === 'host' ? post.guest_user_id : post.claimed_by_host_user_id;

  const modalData = {
    ...post,
    other_party_name: otherPartyName,
    other_party_phone: post.guest_phone || post.phone || post.phone_number || post.host_phone || post.claimed_by_host_phone,
    hosting_date: hostingDate,
    unit_name: post.unit_name,
    service_type: post.service_type,
    origin_city: post.origin_city || post.guest_city,
    guests_count: post.guests_count,
    kashrut_level: post.kashrut || post.kashrut_level,
    description: post.description
  };

  return (
    <>
      <div className={`request-card ${showUrgentNotice ? 'urgent-border-highlight' : ''}`}>
        <div className="card-header">
          <div className="status-badges-group">
            {showUrgentNotice && (
              <span className="status-badge urgent-badge">
                <AlertCircle size={13} />
                {t('guest/requests:card.urgent_notice', { hours: hoursLeft === 0 ? 'פחות משעה' : hoursLeft })}
              </span>
            )}
            <span className={`status-badge ${post.status === 'matched' ? 'matched' : post.status === 'pending' ? 'pending' : ''}`}>
              {statusLabel}
            </span>
          </div>
          <div className="user-info-container">
            <div className="user-name-row">
              <h3>{displayName}</h3>
            </div>
            <p className="card-subtitle">{subtitle}</p>
            {reviewTargetId && (
              <button 
                className="action-button view-reviews-btn" 
                onClick={() => setShowReviewsModal(true)}
              >
                <Star className="w-3 h-3 inline-icon" style={{marginRight: '4px'}} />
                {userRole === 'host' ? t('guest/requests:card.about_guest') : t('guest/requests:card.about_host')}
              </button>
            )}
          </div>
        </div>

        {(() => {
          const desc = post.description || '';
          const matchReturn = desc.match(/מביאים לאירוח:\s*([^\n]+)/);
          const inReturnVal = matchReturn ? matchReturn[1].trim() : null;
          const cleanDesc = desc.replace(/מביאים לאירוח:[^\n]+/, '').trim();

          return (
            <div className="card-description-wrapper">
              {inReturnVal && (
                <div className="card-bring-item">
                  <span>{t('guest/requests:card.bring_item')}</span>
                  <span className="font-bold">{inReturnVal}</span>
                </div>
              )}
              {cleanDesc && (
                <p className="card-description">{cleanDesc}</p>
              )}
            </div>
          );
        })()}

        <div className="card-tags">
          <span className="card-tag tag-kashrut">
            <Utensils className="w-3 h-3" />
            {post.kashrut || t('guest/requests:card.kashrut_default')}
          </span>
          <span className="card-tag tag-guests">
            <Users className="w-3 h-3" />
            {t('guest/requests:card.guests_count', { count: post.guests_count })}
          </span>
          <span className="tag-time">{timeAgo}</span>
        </div>

        {/* Show PendingOfferBox only when a host offered on guest's public post */}
        {userRole === 'guest' && post.status === 'pending' && !isDirectRequest && (
          <PendingOfferBox
            post={post}
            onUpdateSuccess={onUpdateSuccess}
          />
        )}

        <div className="card-actions">
          {post.status === 'matched' || post.status === 'approved' ? (
            <div className="card-matched-banner">
              <div className="card-matched-links">
                <button 
                  onClick={() => {
                    navigate('/chats', {
                      state: {
                        matchId,
                        chatData: {
                          match_id: matchId,
                          other_party_name: otherPartyName,
                          hosting_date: hostingDate,
                          last_message: null,
                          last_message_time: null,
                          unread_count: 0
                        }
                      }
                    });
                  }} 
                  className="card-matched-btn"
                >
                  <MessageSquare size={16} />
                  {t('guest/requests:card.matched_chat')}
                </button>
                <button 
                  className="card-matched-btn"
                  onClick={() => setShowDetailsModal(true)}
                >
                  <ExternalLink size={16} />
                  {t('guest/requests:card.matched_details')}
                </button>
                {userRole === 'guest' && (
                  <button 
                    className="card-matched-btn cancel-btn"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    style={{ color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fee2e2' }}
                  >
                    {isCancelling ? <Loader2 size={16} className="spin-icon" /> : <XCircle size={16} />}
                    {t('guest/requests:card.matched_cancel')}
                  </button>
                )}
              </div>
              <p className="card-matched-status">{t('guest/requests:card.matched_success_banner')}</p>
            </div>
          ) : userRole === 'host' ? (
            post.status === 'pending' ? (
              isDirectRequest ? (
                <button
                  className="action-button claim-button direct-approve-btn"
                  onClick={() => onAction && onAction(post)}
                  disabled={isClaiming}
                >
                  {isClaiming ? <Loader2 className="w-4 h-4 spin-icon" /> : <Check className="w-4 h-4" />}
                  <span>{t('guest/requests:card.btn_approve_request')}</span>
                </button>
              ) : (
                <button
                  className="action-button claim-button waiting-guest-btn"
                  disabled={true}
                >
                  <Clock className="w-4 h-4" />
                  <span>{t('guest/requests:card.btn_waiting_soldier')}</span>
                </button>
              )
            ) : (
              <button
                className={`action-button claim-button ${showUrgentNotice ? 'urgent-claim-btn' : ''}`}
                onClick={() => onAction && onAction(post)}
                disabled={post.status === 'matched' || isClaiming}
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 spin-icon" />
                    <span>{t('guest/requests:card.btn_sending')}</span>
                  </>
                ) : showUrgentNotice ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>{t('guest/requests:card.btn_claim_now')}</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4" />
                    <span>{t('guest/requests:card.btn_claim_request')}</span>
                  </>
                )}
              </button>
            )
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {post.status === 'open' && (
                <button
                  className="action-button edit-button"
                  onClick={() => setIsEditingInline(true)}
                  style={{ flex: 1 }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t('guest/requests:card.btn_edit')}</span>
                </button>
              )}
              {post.status !== 'cancelled' && post.status !== 'rejected' && post.status !== 'declined' && (
                <button
                  className="action-button cancel-button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', fontWeight: '500' }}
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 spin-icon" /> : <XCircle className="w-4 h-4" />}
                  <span>{t('guest/requests:card.btn_cancel')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showDetailsModal && (
        <HostingDetailsModal
          isOpen={showDetailsModal}
          data={modalData}
          userRole={userRole}
          isHostOverride={userRole === 'host'}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
      <ReviewsListModal
        open={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        targetType={userRole === 'host' ? 'guest' : 'host'}
        targetId={userRole === 'host' ? post.guest_profile?.user_id || post.guest_id || post.user_id : post.host_profile_id || post.claimed_by_host_id}
        title={`ביקורות על ${userRole === 'host' ? displayName : otherPartyName}`}
      />
    </>
  );
}

