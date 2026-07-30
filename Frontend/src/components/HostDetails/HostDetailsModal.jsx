import { useState, useEffect } from 'react';
import { X, MapPin, Star, Utensils, Moon, Users, Phone, MessageCircle, CheckCircle2, Shield, Calendar, Info } from 'lucide-react';
import BookingRequestModal from './BookingRequestModal';
import { listingsApi, bookingsApi } from '../../api/api';
import { getUpcomingFridayDateStr, formatHostOpenDates } from '../../utils/shabbat';
import { formatPhoneNumber } from '../../utils/phone';
import { mapHostData } from '../../utils/hostUtils';
import './BookingRequestModal.css';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format';

export function HostDetailsModal({ isOpen, onClose, host: hostInput, hostId, onBookingSuccess }) {
  const [host, setHost] = useState(hostInput || null);
  const [loading, setLoading] = useState(!hostInput && Boolean(hostId));
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [guestBookingStatus, setGuestBookingStatus] = useState({ can_request: true, reason: null });

  useEffect(() => {
    if (hostInput) {
      setHost(hostInput);
    }
  }, [hostInput]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const targetId = hostInput?.id || hostId;

    async function loadData() {
      if (!hostInput && targetId) {
        setLoading(true);
        try {
          const response = await listingsApi.searchHosts();
          const rawData = response.data || [];
          const found = rawData.find(
            (item) => String(item.id) === String(targetId) || String(item.user_id) === String(targetId)
          );
          if (found && isMounted) {
            setHost(mapHostData(found, (k) => {
              if (k === 'guest/host_details:page.kashrut.mehadrin') return 'מהדרין';
              if (k === 'guest/host_details:page.kashrut.kosher') return 'כשר';
              return k;
            }));
          }
        } catch (e) {
          console.error('Error fetching host modal details:', e);
        } finally {
          if (isMounted) setLoading(false);
        }
      }

      if (targetId) {
        try {
          const res = await bookingsApi.checkGuestStatus(targetId);
          if (isMounted && res.data) {
            setGuestBookingStatus(res.data);
            if (!res.data.can_request && res.data.reason) {
              setRequestStatus('error');
              setToastMessage(res.data.reason);
            }
          }
        } catch (e) {
          console.warn('Failed to check guest booking status:', e);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, hostInput, hostId]);

  if (!isOpen) return null;

  const hostName = host?.full_name || host?.host_name || host?.user?.full_name || 'משפחה מארחת';
  const city = host?.city || '';
  const neighborhood = host?.neighborhood || '';
  const imageUrl = host?.image_url || host?.image || DEFAULT_IMAGE;
  const matchPercentage = host?.match_percentage ?? host?.match_score ?? 85;
  const hasLodging = host?.has_lodging !== undefined ? host.has_lodging : true;
  const availableSpots = host?.available_spots !== undefined ? host.available_spots : 0;
  const totalSpots = host?.total_spots || host?.max_guests || 0;
  const rating = host?.rating ? Number(host.rating).toFixed(1) : '4.9';
  const reviewsCount = host?.reviews_count ?? host?.review_count ?? 12;
  const biography = host?.biography || host?.free_text_notes || '';
  const tags = host?.tags || host?.vibe_tags || [];
  const phone = host?.phone_number || host?.phone || host?.user?.phone_number || '';
  const upcomingDateStr = formatHostOpenDates(host) || getUpcomingFridayDateStr(host?.shabbat_date);

  const getKashrutLabel = (level) => {
    if (!level) return 'כשר';
    const norm = String(level).toLowerCase();
    if (norm.includes('mehadrin') || norm.includes('מהדרין') || norm.includes('glatt')) return 'מהדרין';
    return 'כשר';
  };

  const handleBookingSubmit = async ({ selectedDate, selectedDates, guestsCount, notes }) => {
    setRequestStatus('submitting');
    try {
      if (host?.id) {
        const sortedDates = selectedDates && selectedDates.length > 0 ? [...selectedDates].sort() : [selectedDate];
        const startIso = sortedDates[0];
        const endIso = sortedDates.length > 1 ? sortedDates[sortedDates.length - 1] : null;

        await bookingsApi.requestBooking({
          host_profile_id: host.id,
          requested_date: startIso,
          start_date: startIso,
          end_date: endIso,
          nights_count: sortedDates.length,
          guests_count: guestsCount,
          description: notes
        });
        setRequestStatus('success');
        setToastMessage(`בקשת אירוח נשלחה בהצלחה אל ${hostName}!`);
        if (onBookingSuccess) onBookingSuccess();
      }
    } catch (err) {
      console.warn('Booking request error:', err);
      const errorMsg = err.response?.data?.detail || 'כבר שלחת בקשת אירוח למארח זה או שקיימת בקשה פעילה.';
      setRequestStatus('error');
      setToastMessage(errorMsg);
    } finally {
      setIsBookingModalOpen(false);
    }
  };

  const handleSendMessage = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(`שלום ${hostName}, שאלתי לגבי אירוח לשבת דרך אפליקציית שבת מארח.`);
    window.open(`https://wa.me/972${cleanPhone.replace(/^0/, '')}?text=${text}`, '_blank');
  };

  const isBlocked = guestBookingStatus?.can_request === false;

  return (
    <>
      <div className="chat-modal-overlay" onClick={onClose}>
        <div className="chat-modal-card hdm-card" onClick={(e) => e.stopPropagation()} dir="rtl">
          
          {/* Header */}
          <div className="chat-modal-header">
            <div className="chat-modal-title">
              <Shield size={20} className="chat-modal-icon" />
              <h3>כרטיס פרטי מארח</h3>
            </div>
            <button type="button" className="chat-modal-close" onClick={onClose} aria-label="סגור">
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="chat-modal-body text-center py-8">
              <p>טוען פרטי מארח...</p>
            </div>
          ) : (
            <div className="chat-modal-body hdm-body">
              {/* Top Profile Summary Banner */}
              <div className="hdm-profile-banner">
                <img src={imageUrl} alt={hostName} className="hdm-avatar" />
                <div className="hdm-profile-info">
                  <div className="hdm-name-row">
                    <h4 className="hdm-name">{hostName}</h4>
                    <span className="hdm-match-badge">{matchPercentage}% התאמה</span>
                  </div>
                  <p className="hdm-location">
                    <MapPin size={15} />
                    {city} {neighborhood ? `· ${neighborhood}` : ''}
                  </p>
                  <div className="hdm-rating-row">
                    <Star size={14} className="star-icon-amber" fill="#f59e0b" />
                    <span>{rating} ({reviewsCount} חוות דעת)</span>
                  </div>
                </div>
              </div>

              {/* Stats Highlights */}
              <div className="host-stats-grid hdm-stats-grid">
                <div className="stat-card">
                  <Users className="stat-icon text-emerald" />
                  <p className="stat-value text-emerald">{availableSpots}/{totalSpots || 4}</p>
                  <p className="stat-label">מקומות פנויים</p>
                </div>
                <div className="stat-card">
                  <Utensils className="stat-icon text-purple" />
                  <p className="stat-value text-purple">{getKashrutLabel(host?.kashrut_level)}</p>
                  <p className="stat-label">רמת כשרות</p>
                </div>
                <div className="stat-card">
                  <Moon className="stat-icon text-primary" />
                  <p className="stat-value text-primary">{hasLodging ? 'לינה וארוחות' : 'ארוחות בלבד'}</p>
                  <p className="stat-label">סוג אירוח</p>
                </div>
              </div>

              {/* Open Date Notice */}
              <div className="chat-modal-row hdm-date-row">
                <Calendar size={18} className="chat-modal-row-icon" />
                <div>
                  <span className="chat-modal-label">תאריכים פנויים לאירוח</span>
                  <p className="chat-modal-value font-bold">{upcomingDateStr}</p>
                </div>
              </div>

              {phone && (
                <div className="chat-modal-row">
                  <Phone size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">מספר טלפון המארח</span>
                    <p className="chat-modal-value chat-modal-value-phone" dir="ltr">{formatPhoneNumber(phone)}</p>
                  </div>
                </div>
              )}

              {/* About Section */}
              {biography && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">קצת עלינו</span>
                    <p className="chat-modal-value">{biography}</p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="hdm-tags-row">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="card-tag-pill">{tag}</span>
                  ))}
                </div>
              )}

              {toastMessage && (
                <div className={requestStatus === 'error' ? "toast-error-box" : "toast-success-box"}>
                  {toastMessage}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="chat-modal-footer hdm-footer">
            <button
              type="button"
              className="sidebar-message-btn"
              onClick={handleSendMessage}
            >
              <MessageCircle size={16} />
              הודעה
            </button>

            <button
              type="button"
              className="sidebar-booking-btn"
              onClick={() => setIsBookingModalOpen(true)}
              disabled={isBlocked || requestStatus === 'success'}
            >
              {requestStatus === 'success' ? (
                <>
                  <CheckCircle2 size={16} />
                  נשלחה בקשה!
                </>
              ) : (
                'שלח בקשת אירוח'
              )}
            </button>
          </div>
        </div>
      </div>

      {isBookingModalOpen && (
        <BookingRequestModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          host={host}
          onSubmit={handleBookingSubmit}
          isSubmitting={requestStatus === 'submitting'}
        />
      )}
    </>
  );
}
