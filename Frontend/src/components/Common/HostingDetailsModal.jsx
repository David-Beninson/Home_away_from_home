
import { useSelector } from 'react-redux';
import { WhatsAppIcon } from './Icons';
import { X, Calendar, User, Phone, MapPin, Shield, Users, Home, Info } from 'lucide-react';

export function HostingDetailsModal({ isOpen, onClose, data, isHostOverride }) {
  const currentUser = useSelector((state) => state.auth.user);
  const isHost = isHostOverride !== undefined ? isHostOverride : currentUser?.user_type === 'host';

  if (!isOpen || !data) return null;

  const modalTitle = isHost ? 'פרטי האורח' : 'פרטי האירוח לשבת';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    } catch {
      return '';
    }
  };

  const otherPartyName = data.other_party_name || data.guest_name || data.guest_profile?.user?.full_name || data.host_name || data.claimed_by_host_name || (isHost ? 'אורח' : 'מארח');
  const phone = data.other_party_phone || data.guest_phone || data.guestPhone || data.phone || data.phone_number;
  const hostingDate = data.hosting_date || data.requested_date || data.start_date || data.date;
  const location = data.location || data.city || data.address || data.origin_city || data.guest_city;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
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
                {phone || 'לא עודכן מס׳ טלפון'}
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
              {data.guests_count && (
                <div className="chat-modal-row">
                  <Users size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">כמות אורחים</span>
                    <p className="chat-modal-value">{data.guests_count} חבר'ה</p>
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

              {/* Skills / Notes */}
              {(data.skills_give_take || data.notes || data.description) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">כישורים / הערות</span>
                    <p className="chat-modal-value">{data.skills_give_take || data.notes || data.description}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Guest view: Hosting Location */}
              <div className="chat-modal-row">
                <MapPin size={18} className="chat-modal-row-icon" />
                <div>
                  <span className="chat-modal-label">מיקום אירוח</span>
                  <p className="chat-modal-value">
                    {location || 'ירושלים והסביבה'}
                  </p>
                </div>
              </div>

              {/* Hosting Date */}
              <div className="chat-modal-row">
                <Calendar size={18} className="chat-modal-row-icon" />
                <div>
                  <span className="chat-modal-label">תאריך אירוח</span>
                  <p className="chat-modal-value">
                    {hostingDate ? formatDate(hostingDate) : 'לא מצוין תאריך'}
                  </p>
                </div>
              </div>
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
