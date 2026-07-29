import { useSelector } from 'react-redux';
import { WhatsAppIcon } from './Icons';
import { X, Calendar, User, Phone, MapPin, Shield, Users, Home, Info, Gift, Utensils, Moon } from 'lucide-react';
import { formatPhoneNumber } from '../../utils/phone';

export function HostingDetailsModal({ isOpen, onClose, data, isHostOverride, userRole }) {
  const currentUser = useSelector((state) => state.auth.user);
  
  if (!isOpen || !data) return null;

  const isHost = isHostOverride !== undefined 
    ? isHostOverride 
    : (userRole ? userRole === 'host' : currentUser?.user_type === 'host');

  const modalTitle = isHost ? 'פרטי האורח' : 'פרטי האירוח לשבת';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  // Strict Phone Visibility Rule:
  // - Guest ALWAYS sees the host's phone number.
  // - Host sees the guest's phone number UNLESS the guest request is explicitly anonymous (is_anonymous === true).
  const isAnonymousGuest = isHost && Boolean(data.is_anonymous || data.isAnonymous);

  const otherPartyName = isAnonymousGuest 
    ? 'אורח אנונימי' 
    : (data.other_party_name || data.guest_name || data.guest_profile?.user?.full_name || data.host_name || data.claimed_by_host_name || data.user?.full_name || data.full_name || (isHost ? 'אורח' : 'מארח'));

  const phone = isAnonymousGuest
    ? null
    : (data.other_party_phone || data.guest_phone || data.guestPhone || data.phone || data.phone_number || data.host_phone || data.claimed_by_host_phone || data.user?.phone_number);

  const hostingDate = data.hosting_date || data.requested_date || data.start_date || data.date || data.shabbat_date;
  const location = data.location || data.city || data.address || data.origin_city || data.guest_city || data.neighborhood;

  // Description & inReturn Parsing
  const rawDescription = data.description || data.notes || data.free_text_notes || '';
  const matchReturn = rawDescription.match(/מביאים לאירוח:\s*([^\n]+)/);
  const inReturnVal = data.inReturn || data.in_return || (matchReturn ? matchReturn[1].trim() : null);
  const cleanDescription = rawDescription.replace(/מביאים לאירוח:[^\n]+/, '').trim();

  // Kashrut & Lodging Details
  const kashrutLevel = data.kashrut || data.kashrut_level;
  const getKashrutLabel = (level) => {
    if (!level) return 'כשר';
    const norm = String(level).toLowerCase();
    if (norm.includes('mehadrin') || norm.includes('מהדרין') || norm.includes('glatt')) return 'מהדרין';
    return 'כשר';
  };

  const hasLodging = data.has_lodging !== undefined 
    ? data.has_lodging 
    : (data.availability_windows ? data.availability_windows.includes('לינה') : true);

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-card" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="chat-modal-header">
          <div className="chat-modal-title">
            <User size={20} className="chat-modal-icon" />
            <h3>{modalTitle}</h3>
          </div>
          <button 
            type="button" 
            className="chat-modal-close" 
            onClick={onClose}
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-body">
          {/* Full Name */}
          <div className="chat-modal-row">
            <User size={18} className="chat-modal-row-icon" />
            <div>
              <span className="chat-modal-label">{isHost ? 'שם האורח' : 'שם המארח'}</span>
              <p className="chat-modal-value">{otherPartyName}</p>
            </div>
          </div>

          {/* Phone Number */}
          <div className="chat-modal-row">
            <Phone size={18} className="chat-modal-row-icon" />
            <div>
              <span className="chat-modal-label">מספר טלפון</span>
              <p className="chat-modal-value chat-modal-value-phone" dir="ltr">
                {isAnonymousGuest ? 'מוסתר (בקשה אנונימית)' : (phone ? formatPhoneNumber(phone) : 'מספר טלפון לא עודכן במערכת')}
              </p>
            </div>
          </div>

          {/* Hosting Date */}
          <div className="chat-modal-row">
            <Calendar size={18} className="chat-modal-row-icon" />
            <div>
              <span className="chat-modal-label">תאריך אירוח</span>
              <p className="chat-modal-value">
                {hostingDate ? formatDate(hostingDate) : 'תאריך קרוב לשבת'}
              </p>
            </div>
          </div>

          {isHost ? (
            <>
              {/* Service Type / Status */}
              {(data.service_type || data.is_soldier_or_national_service !== undefined) && (
                <div className="chat-modal-row">
                  <Shield size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">סוג שירות / סטטוס</span>
                    <p className="chat-modal-value">
                      {data.service_type || (data.is_soldier_or_national_service ? 'חייל / שירות לאומי' : 'אזרח')}
                    </p>
                  </div>
                </div>
              )}

              {/* Unit/Role */}
              {(data.unit_name || data.guest_unit) && (
                <div className="chat-modal-row">
                  <Shield size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">יחידה / תפקיד</span>
                    <p className="chat-modal-value">{data.unit_name || data.guest_unit}</p>
                  </div>
                </div>
              )}

              {/* Guests Count */}
              {(data.guests_count || data.guestsCount) && (
                <div className="chat-modal-row">
                  <Users size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">כמות אורחים</span>
                    <p className="chat-modal-value">{data.guests_count || data.guestsCount} חבר'ה</p>
                  </div>
                </div>
              )}

              {/* Guest Origin City */}
              {(data.origin_city || data.guest_city) && (
                <div className="chat-modal-row">
                  <Home size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">עיר מגורים</span>
                    <p className="chat-modal-value">{data.origin_city || data.guest_city}</p>
                  </div>
                </div>
              )}

              {/* Bringing item / gift */}
              {inReturnVal && (
                <div className="chat-modal-row">
                  <Gift size={18} className="chat-modal-row-icon text-amber" />
                  <div>
                    <span className="chat-modal-label">מביאים לאירוח</span>
                    <p className="chat-modal-value font-bold">{inReturnVal}</p>
                  </div>
                </div>
              )}

              {/* Food preferences / allergies */}
              {(data.food_preferences_allergies || data.food_preferences) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">העדפות מזון / אלרגיות</span>
                    <p className="chat-modal-value">{data.food_preferences_allergies || data.food_preferences}</p>
                  </div>
                </div>
              )}

              {/* Notes / Special Requests */}
              {(cleanDescription || data.skills_give_take) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">כישורים / הערות האורח</span>
                    <p className="chat-modal-value">{cleanDescription || data.skills_give_take}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Hosting Location */}
              <div className="chat-modal-row">
                <MapPin size={18} className="chat-modal-row-icon" />
                <div>
                  <span className="chat-modal-label">מיקום אירוח</span>
                  <p className="chat-modal-value">
                    {location || 'ישראל'}
                  </p>
                </div>
              </div>

              {/* Kashrut */}
              {kashrutLevel && (
                <div className="chat-modal-row">
                  <Utensils size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">רמת כשרות</span>
                    <p className="chat-modal-value">{getKashrutLabel(kashrutLevel)}</p>
                  </div>
                </div>
              )}

              {/* Lodging */}
              <div className="chat-modal-row">
                <Moon size={18} className="chat-modal-row-icon" />
                <div>
                  <span className="chat-modal-label">סוג אירוח</span>
                  <p className="chat-modal-value">
                    {hasLodging ? 'כולל לינה וארוחות שבת' : 'ארוחות שבת בלבד'}
                  </p>
                </div>
              </div>

              {/* Spots */}
              {(data.available_spots !== undefined || data.max_guests !== undefined) && (
                <div className="chat-modal-row">
                  <Users size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">מקומות אירוח פנויים</span>
                    <p className="chat-modal-value">
                      {data.available_spots !== undefined ? `${data.available_spots} מקומות פנויים` : `${data.max_guests} מקומות`}
                    </p>
                  </div>
                </div>
              )}

              {/* Host House Notes */}
              {(cleanDescription || data.free_text_notes || data.biography) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">הערות / פרטים נוספים מהמארח</span>
                    <p className="chat-modal-value">{cleanDescription || data.free_text_notes || data.biography}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="chat-modal-footer">
          <button
            type="button"
            className="chat-modal-btn-close"
            onClick={onClose}
          >
            סגור
          </button>
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`שלום, בהקשר לאירוח בתאריך ${formatShortDate(hostingDate) || formatDate(hostingDate) || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-modal-btn-wa"
            >
              <WhatsAppIcon size={16} />
              פתח בוואצאפ
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
