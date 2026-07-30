import { Zap, Star, Phone, MessageCircle, CheckCircle2 } from 'lucide-react';
import { formatPhoneNumber } from '../../utils/phone';
import { useTranslation } from 'react-i18next';

export default function HostDetailsSidebar({
  matchPercentage,
  rating,
  reviewsCount,
  upcomingFridayDate,
  phone,
  handleSendMessage,
  handleSendBookingRequest,
  requestStatus,
  availableSpots,
  toastMessage,
  guestBookingStatus,
  onReviewsClick
}) {
  const { t } = useTranslation(['guest/host_details']);
  const isBlocked = guestBookingStatus?.can_request === false;
  const disabledReason = guestBookingStatus?.reason || t('guest/host_details:sidebar.disabled_reason_default');

  return (
    <div className="sidebar-booking-card">
      {/* Header: Match Score Right, Rating Left */}
      <div className="sidebar-header-row">
        <span className="sidebar-match-badge">
          <Zap className="badge-icon-sm" />
          {matchPercentage}%
        </span>

        <button 
          type="button"
          className="sidebar-rating-group" 
          onClick={onReviewsClick}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Star className="star-icon-filled" />
          <span className="rating-score">{rating}</span>
          <span className="rating-count">{t('guest/host_details:sidebar.reviews_count', { count: reviewsCount })}</span>
        </button>
      </div>

      {/* Date Subtitle */}
      <p className="sidebar-date-text">{upcomingFridayDate}</p>

      {/* Action Buttons Row (Phone & Message) */}
      <div className="sidebar-action-buttons">
        <a href={`tel:${phone}`} className="sidebar-phone-btn" title={phone ? formatPhoneNumber(phone) : ''}>
          <Phone className="btn-icon" />
          {phone ? formatPhoneNumber(phone) : t('guest/host_details:sidebar.btn_call')}
        </a>
        <button
          type="button"
          onClick={handleSendMessage}
          className="sidebar-message-btn"
        >
          <MessageCircle className="btn-icon" />
          {t('guest/host_details:sidebar.btn_message')}
        </button>
      </div>

      {/* Main Booking CTA */}
      <button
        type="button"
        onClick={handleSendBookingRequest}
        disabled={requestStatus === 'submitting' || requestStatus === 'success' || isBlocked}
        title={isBlocked ? disabledReason : ''}
        className="sidebar-booking-btn"
      >
        {requestStatus === 'submitting' ? (
          t('guest/host_details:sidebar.btn_submitting')
        ) : isBlocked ? (
          t('guest/host_details:sidebar.btn_blocked')
        ) : requestStatus === 'success' ? (
          <>
            <CheckCircle2 className="success-icon" />
            {t('guest/host_details:sidebar.btn_success')}
          </>
        ) : (
          t('guest/host_details:sidebar.btn_submit')
        )}
      </button>

      {/* Urgency Footnote */}
      {availableSpots > 0 ? (
        <p className="spots-urgency-text text-amber">
         {t('guest/host_details:sidebar.urgency_available', { count: availableSpots })}
        </p>
      ) : (
        <p className="spots-urgency-text text-red">
          {t('guest/host_details:sidebar.urgency_full')}
        </p>
      )}

      {toastMessage && (
        <div className={requestStatus === 'error' ? "toast-error-box" : "toast-success-box"}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
