import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, MessageSquare, Lock, Unlock, RotateCcw, Check, User, Loader2, Clock, ExternalLink } from 'lucide-react';
import {
  deselectDate,
  setOverride,
  clearOverride,
  computeDayStatus,
  fetchAvailability,
} from '../../store/availabilitySlice';
import { fetchPosts, fetchAllRequests } from '../../store/requestsSlice';
import { postsApi, bookingsApi } from '../../api/api';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    dayName: HEBREW_DAYS[date.getDay()],
    dayNum: day,
    monthName: HEBREW_MONTHS[month - 1],
    year,
  };
}

const STATUS_META = {
  open: { label: 'פתוח לאירוח', className: 'ddp-status--open', emoji: '🟢' },
  closed: { label: 'חסום / סגור', className: 'ddp-status--closed', emoji: '🔴' },
  booked: { label: 'תפוס – אורחים', className: 'ddp-status--booked', emoji: '🔵' },
  past: { label: 'תאריך עבר', className: 'ddp-status--past', emoji: '⚪' },
  notice_closed: { label: 'חסום (עבר הזמן)', className: 'ddp-status--notice', emoji: '🟡' },
};

import { useNavigate } from 'react-router-dom';
import { HostingDetailsModal } from '../Common/HostingDetailsModal';

export default function DayDetailPanel() {
  const dispatch = useDispatch();
  const { selectedDate, rules, overrides, bookings } = useSelector((s) => s.availability);
  const posts = useSelector((s) => s.requests?.posts || []);
  const [submittingId, setSubmittingId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const navigate = useNavigate();

  const handleClose = useCallback(() => dispatch(deselectDate()), [dispatch]);

  if (!selectedDate) return null;

  const getLocalDateString = (val) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const matchedRequests = (posts || []).filter((p) => {
    if (p.status !== 'matched') return false;
    const startDateVal = p.start_date || p.requested_date || p.shabbat_date;
    if (!startDateVal) return false;
    const startD = getLocalDateString(startDateVal);
    if (!startD) return false;
    if (startD === selectedDate) return true;
    if (p.end_date) {
      const endD = getLocalDateString(p.end_date);
      if (endD) {
        return selectedDate >= startD && selectedDate <= endD;
      }
    }
    return false;
  });

  const booking = bookings[selectedDate];
  const activeBooking = booking || (matchedRequests.length > 0 ? {
    guestName: matchedRequests[0].guest_name || matchedRequests[0].guest_profile?.user?.full_name || 'אורח',
    guestPhone: matchedRequests[0].guest_phone || matchedRequests[0].guest_profile?.user?.phone_number,
    guestsCount: matchedRequests[0].guests_count,
    notes: matchedRequests[0].description,
    unitName: matchedRequests[0].unit_name,
    match_id: matchedRequests[0].pending_match_id || matchedRequests[0].id,
    post: matchedRequests[0]
  } : null);

  let status = computeDayStatus(selectedDate, rules, overrides, bookings);
  const isPast = status === 'past';

  if (activeBooking && !isPast) {
    status = 'booked';
  }
  const meta = STATUS_META[status] || STATUS_META.closed;
  const { dayName, dayNum, monthName, year } = formatDate(selectedDate);
  const hasOverride = !!overrides[selectedDate];

  const pendingRequests = (posts || []).filter((p) => {
    const isPending = p.status === 'pending' || p.status === 'open';
    if (!isPending) return false;
    const startDateVal = p.start_date || p.requested_date || p.shabbat_date;
    if (!startDateVal) return false;
    const startD = getLocalDateString(startDateVal);
    if (!startD) return false;
    if (startD === selectedDate) return true;
    if (p.end_date) {
      const endD = getLocalDateString(p.end_date);
      if (endD) {
        return selectedDate >= startD && selectedDate <= endD;
      }
    }
    return false;
  });

  const handleOpen = () => dispatch(setOverride({ dateStr: selectedDate, status: 'open' }));
  const handleBlockDay = () => dispatch(setOverride({ dateStr: selectedDate, status: 'closed' }));
  const handleRevert = () => dispatch(clearOverride({ dateStr: selectedDate }));

  const handleApproveRequest = async (post) => {
    try {
      setSubmittingId(post.id);
      if (post.pending_match_id) {
        await bookingsApi.respondToBooking(post.pending_match_id, 'matched');
      } else {
        await postsApi.claimPost(post.id);
      }
      // Refresh state across calendar & posts
      dispatch(fetchAvailability());
      dispatch(fetchPosts());
    } catch (err) {
      console.error('Failed to approve request:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(e => e.msg || e.detail).join(', ')
          : (detail && typeof detail === 'object' ? JSON.stringify(detail) : err.message);
      alert('שגיאה באישור הבקשה: ' + errorMsg);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectRequest = async (post) => {
    try {
      setSubmittingId(post.id);
      if (post.pending_match_id) {
        await bookingsApi.respondToBooking(post.pending_match_id, 'rejected');
      }
      // Refresh state across calendar & posts
      dispatch(fetchAvailability());
      dispatch(fetchPosts());
    } catch (err) {
      console.error('Failed to reject request:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(e => e.msg || e.detail).join(', ')
          : (detail && typeof detail === 'object' ? JSON.stringify(detail) : err.message);
      alert('שגיאה בדחיית הבקשה: ' + errorMsg);
    } finally {
      setSubmittingId(null);
    }
  };

  const whatsappUrl = booking?.guestPhone
    ? `https://wa.me/972${booking.guestPhone.replace(/^0/, '')}?text=${encodeURIComponent('שלום! זהו מנהל המארח מ"שבת שלום". אשמח לדבר אתך לפני השבת 🕯️')}`
    : null;

  return (
    <>
      <div className="ddp-overlay" onClick={handleClose} aria-hidden="true" />
      <aside className="ddp-panel" role="dialog" aria-modal="true" aria-label="פרטי תאריך">

        <div className="ddp-header">
          <div className="ddp-header-info">
            <p className="ddp-day-name">{dayName}</p>
            <h2 className="ddp-date-title">{dayNum} ב{monthName} {year}</h2>
          </div>
          <button className="ddp-close-btn" id="ddp-close" onClick={handleClose} aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <div className={`ddp-status-badge ${meta.className}`}>
          <span className="ddp-status-emoji">{meta.emoji}</span>
          <span className="ddp-status-label">{meta.label}</span>
        </div>

        {/* ── Pending Requests List & Actions ── */}
        {pendingRequests.length > 0 && (
          <div className="ddp-pending-section">
            <h4 className="ddp-pending-title">
              בקשות אירוח ממתינות ({pendingRequests.length}):
            </h4>
            {pendingRequests.map((post) => {
              const isCurrentSubmitting = submittingId === post.id;
              const isWaitingGuest = post.status === 'pending' && !post.is_direct_request;
              const desc = post.description || '';
              const matchReturn = desc.match(/מביאים לאירוח:\s*([^\n]+)/);
              const inReturnVal = matchReturn ? matchReturn[1].trim() : null;
              const cleanDesc = desc.replace(/מביאים לאירוח:[^\n]+/, '').trim();

              return (
                <div
                  key={post.id}
                  className={`ddp-booking-card ${isWaitingGuest ? 'ddp-card-waiting' : 'ddp-card-pending'}`}
                >
                  <div className={`ddp-booking-header ${isWaitingGuest ? 'ddp-header-waiting' : 'ddp-header-pending'}`}>
                    {isWaitingGuest ? <Clock size={18} /> : <User size={18} />}
                    <h3>
                      {isWaitingGuest
                        ? 'ממתין לאישור האורח'
                        : post.is_direct_request
                          ? 'בקשת אירוח ישירה'
                          : 'בקשת אירוח מלוח פוסטים'}
                    </h3>
                  </div>

                  <div className="ddp-booking-row">
                    <span className="ddp-booking-label">שם האורח</span>
                    <span className="ddp-booking-value font-bold">
                      {post.guest_name || post.guest_profile?.user?.full_name || 'אורח'}
                    </span>
                  </div>

                  {post.unit_name && (
                    <div className="ddp-booking-row">
                      <span className="ddp-booking-label">יחידה / תפקיד</span>
                      <span className="ddp-booking-value">{post.unit_name}</span>
                    </div>
                  )}

                  <div className="ddp-booking-row">
                    <span className="ddp-booking-label">כמות חבר'ה</span>
                    <span className="ddp-booking-value ddp-value-highlight">
                      {post.guests_count || 1} חבר'ה
                    </span>
                  </div>

                  {post.nights_count && post.nights_count > 1 && (
                    <div className="ddp-booking-row">
                      <span className="ddp-booking-label">משך אירוח</span>
                      <span className="ddp-booking-value">{post.nights_count} לילות</span>
                    </div>
                  )}

                  {inReturnVal && (
                    <div className="ddp-booking-row ddp-return-box">
                      <span className="ddp-booking-label ddp-return-label">
                        מביאים לאירוח
                      </span>
                      <span className="ddp-booking-value ddp-return-value">
                        {inReturnVal}
                      </span>
                    </div>
                  )}

                  {cleanDesc && (
                    <div className="ddp-booking-row ddp-desc-row">
                      <span className="ddp-booking-label">הערות האורח</span>
                      <span className="ddp-booking-value">{cleanDesc}</span>
                    </div>
                  )}

                  {isWaitingGuest ? (
                    <div className="ddp-waiting-notice">
                      <Clock size={16} />
                      <span>הצעת אירוח נשלחה — ממתין לאישור האורח...</span>
                    </div>
                  ) : (
                    <div className="ddp-request-actions">
                      <button
                        onClick={() => handleApproveRequest(post)}
                        disabled={submittingId !== null}
                        className="ddp-btn-approve"
                      >
                        {isCurrentSubmitting ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
                        <span>אישור בקשה</span>
                      </button>

                      <button
                        onClick={() => handleRejectRequest(post)}
                        disabled={submittingId !== null}
                        className="ddp-btn-reject"
                      >
                        {isCurrentSubmitting ? <Loader2 size={16} className="spin-icon" /> : <X size={16} />}
                        <span>דחיית בקשה</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeBooking && (
          <div className="ddp-booking-card ddp-card-overflow">
            <div className="ddp-card-body">
              <div className="ddp-booking-header">
                <User size={16} />
                <h3>פרטי האורח/ים באירוח זה</h3>
              </div>
              <div className="ddp-booking-row">
                <span className="ddp-booking-label">שם האורח</span>
                <span className="ddp-booking-value font-bold">{activeBooking.guestName || '—'}</span>
              </div>
              {activeBooking.unitName && (
                <div className="ddp-booking-row">
                  <span className="ddp-booking-label">יחידה / תפקיד</span>
                  <span className="ddp-booking-value">{activeBooking.unitName}</span>
                </div>
              )}
              {activeBooking.guestsCount && (
                <div className="ddp-booking-row">
                  <span className="ddp-booking-label">כמות אורחים</span>
                  <span className="ddp-booking-value ddp-value-highlight">{activeBooking.guestsCount} חבר'ה</span>
                </div>
              )}
              {activeBooking.guestPhone && (
                <div className="ddp-booking-row">
                  <span className="ddp-booking-label">טלפון</span>
                  <span className="ddp-booking-value" dir="ltr">{activeBooking.guestPhone}</span>
                </div>
              )}
              {activeBooking.notes && (
                <div className="ddp-booking-row">
                  <span className="ddp-booking-label">הערות</span>
                  <span className="ddp-booking-value">{activeBooking.notes}</span>
                </div>
              )}
            </div>

            <div className="ddp-matched-footer">
              <div className="ddp-matched-links">
                <button
                  onClick={() => {
                    handleClose();
                    const matchId = activeBooking.match_id || activeBooking.id;
                    const otherPartyName = activeBooking.guestName || activeBooking.guest_name || 'אורח / חייל';
                    const hostingDate = activeBooking.date || activeBooking.hosting_date || selectedDate;
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
                  className="ddp-chat-link"
                >
                  <MessageSquare size={16} />
                  צ'אט
                </button>
                <button
                  className="ddp-chat-link"
                  onClick={() => setShowDetailsModal(true)}
                >
                  <ExternalLink size={16} />
                  פרטי אירוח
                </button>
              </div>
              <p className="ddp-matched-badge">האירוח אושר! ✓</p>
            </div>
          </div>
        )}

        <HostingDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          data={{
            ...(activeBooking || {}),
            other_party_name: activeBooking?.guestName || activeBooking?.guest_name || 'אורח / חייל',
            other_party_phone: activeBooking?.guestPhone || activeBooking?.phone,
            hosting_date: activeBooking?.date || activeBooking?.hosting_date || selectedDate
          }}
          isHostOverride={true}
        />

        {!isPast && status !== 'booked' && (
          <div className="ddp-actions">
            <p className="ddp-actions-label">שנה סטטוס יום זה:</p>
            {status !== 'open' ? (
              <button id="ddp-action-open" className="ddp-action-btn ddp-action-btn--open" onClick={handleOpen}>
                <Unlock size={16} /> פתח לאירוח
              </button>
            ) : (
              <button id="ddp-action-close" className="ddp-action-btn ddp-action-btn--close" onClick={handleBlockDay}>
                <Lock size={16} /> סגור תאריך זה
              </button>
            )}
            {hasOverride && (
              <button id="ddp-action-revert" className="ddp-action-btn ddp-action-btn--revert" onClick={handleRevert}>
                <RotateCcw size={14} /> חזור לכלל הקבוע
              </button>
            )}
          </div>
        )}

        {status === 'notice_closed' && (
          <div className="ddp-notice-info">
            <p>
              היום עבר את שעת ההתרעה הקבועה ({rules.noticeCutoffHour}:00).
              באפשרותך לפתוח אותו ידנית אם ברצונך לקבל אורחים בכל זאת.
            </p>
          </div>
        )}

      </aside>
    </>
  );
}
