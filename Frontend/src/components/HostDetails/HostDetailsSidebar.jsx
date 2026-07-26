import { Zap, Star, Phone, MessageCircle, CheckCircle2 } from 'lucide-react';

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
  guestBookingStatus
}) {
  const isBlocked = guestBookingStatus?.can_request === false;
  const disabledReason = guestBookingStatus?.reason || 'לא ניתן לשלוח בקשת אירוח נוספת';

  return (
    <div className="sidebar-booking-card">
      {/* Header: Match Score Right, Rating Left */}
      <div className="sidebar-header-row">
        <span className="sidebar-match-badge">
          <Zap className="badge-icon-sm" />
          {matchPercentage}%
        </span>

        <span className="sidebar-rating-group">
          <Star className="star-icon-filled" />
          <span className="rating-score">{rating}</span>
          <span className="rating-count">({reviewsCount})</span>
        </span>
      </div>

      {/* Date Subtitle */}
      <p className="sidebar-date-text">{upcomingFridayDate}</p>

      {/* Action Buttons Row (Phone & Message) */}
      <div className="sidebar-action-buttons">
        <a href={`tel:${phone}`} className="sidebar-phone-btn">
          <Phone className="btn-icon" />
          שיחה
        </a>
        <button
          type="button"
          onClick={handleSendMessage}
          className="sidebar-message-btn"
        >
          <MessageCircle className="btn-icon" />
          הודעה
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
          'שולח בקשה...'
        ) : isBlocked ? (
          'חוסר אפשרות לבקש אירוח'
        ) : requestStatus === 'success' ? (
          <>
            <CheckCircle2 className="success-icon" />
            בקשת אירוח נשלחה!
          </>
        ) : (
          'שלח בקשת אירוח'
        )}
      </button>

      {/* Urgency Footnote */}
      {availableSpots > 0 ? (
        <p className="spots-urgency-text text-amber">
         פנוי לאירוח של עד {availableSpots} חבר'ה!
        </p>
      ) : (
        <p className="spots-urgency-text text-red">
          אזלו המקומות לסופ"ש הקרוב
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
