import { useSelector } from 'react-redux';
import { WhatsAppIcon } from './Icons';
import { X, Calendar, User, Phone, MapPin, Shield, Users, Home, Info, Gift, Utensils, Moon } from 'lucide-react';
import { formatPhoneNumber } from '../../utils/phone';
import { useTranslation } from 'react-i18next';

export function HostingDetailsModal({ isOpen, onClose, data, isHostOverride, userRole }) {
  const { t } = useTranslation(['common/hosting_details_modal']);
  const currentUser = useSelector((state) => state.auth.user);
  
  if (!isOpen || !data) return null;

  const isHost = isHostOverride !== undefined 
    ? isHostOverride 
    : (userRole ? userRole === 'host' : currentUser?.user_type === 'host');

  const modalTitle = isHost ? t('common/hosting_details_modal:title_guest') : t('common/hosting_details_modal:title_hosting');

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
    ? t('common/hosting_details_modal:default_anonymous') 
    : (data.other_party_name || data.guest_name || data.guest_profile?.user?.full_name || data.host_name || data.claimed_by_host_name || data.user?.full_name || data.full_name || (isHost ? t('common/hosting_details_modal:default_guest_name') : t('common/hosting_details_modal:default_host_name')));

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
    if (!level) return t('common/hosting_details_modal:kashrut_kosher');
    const norm = String(level).toLowerCase();
    if (norm.includes('mehadrin') || norm.includes('מהדרין') || norm.includes('glatt')) return t('common/hosting_details_modal:kashrut_mehadrin');
    return t('common/hosting_details_modal:kashrut_kosher');
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
            aria-label={t('common/hosting_details_modal:btn_close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-body">
          {/* Full Name */}
          <div className="chat-modal-row">
            <User size={18} className="chat-modal-row-icon" />
            <div>
              <span className="chat-modal-label">{isHost ? t('common/hosting_details_modal:label_guest_name') : t('common/hosting_details_modal:label_host_name')}</span>
              <p className="chat-modal-value">{otherPartyName}</p>
            </div>
          </div>

          {/* Phone Number */}
          <div className="chat-modal-row">
            <Phone size={18} className="chat-modal-row-icon" />
            <div>
              <span className="chat-modal-label">{t('common/hosting_details_modal:label_phone')}</span>
              <p className="chat-modal-value chat-modal-value-phone" dir="ltr">
                {isAnonymousGuest ? t('common/hosting_details_modal:hidden_phone') : (phone ? formatPhoneNumber(phone) : t('common/hosting_details_modal:no_phone'))}
              </p>
            </div>
          </div>

          {/* Hosting Date */}
          <div className="chat-modal-row">
            <Calendar size={18} className="chat-modal-row-icon" />
            <div>
              <span className="chat-modal-label">{t('common/hosting_details_modal:label_date')}</span>
              <p className="chat-modal-value">
                {hostingDate ? formatDate(hostingDate) : t('common/hosting_details_modal:default_date')}
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
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_service')}</span>
                    <p className="chat-modal-value">
                      {data.service_type || (data.is_soldier_or_national_service ? t('common/hosting_details_modal:service_soldier') : t('common/hosting_details_modal:service_civilian'))}
                    </p>
                  </div>
                </div>
              )}

              {/* Unit/Role */}
              {(data.unit_name || data.guest_unit) && (
                <div className="chat-modal-row">
                  <Shield size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_unit')}</span>
                    <p className="chat-modal-value">{data.unit_name || data.guest_unit}</p>
                  </div>
                </div>
              )}

              {/* Guests Count */}
              {(data.guests_count || data.guestsCount) && (
                <div className="chat-modal-row">
                  <Users size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_guests')}</span>
                    <p className="chat-modal-value">{t('common/hosting_details_modal:guests_count', { count: data.guests_count || data.guestsCount })}</p>
                  </div>
                </div>
              )}

              {/* Guest Origin City */}
              {(data.origin_city || data.guest_city) && (
                <div className="chat-modal-row">
                  <Home size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_city')}</span>
                    <p className="chat-modal-value">{data.origin_city || data.guest_city}</p>
                  </div>
                </div>
              )}

              {/* Bringing item / gift */}
              {inReturnVal && (
                <div className="chat-modal-row">
                  <Gift size={18} className="chat-modal-row-icon text-amber" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_return')}</span>
                    <p className="chat-modal-value font-bold">{inReturnVal}</p>
                  </div>
                </div>
              )}

              {/* Food preferences / allergies */}
              {(data.food_preferences_allergies || data.food_preferences) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_food')}</span>
                    <p className="chat-modal-value">{data.food_preferences_allergies || data.food_preferences}</p>
                  </div>
                </div>
              )}

              {/* Notes / Special Requests */}
              {(cleanDescription || data.skills_give_take) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_guest_notes')}</span>
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
                  <span className="chat-modal-label">{t('common/hosting_details_modal:label_location')}</span>
                  <p className="chat-modal-value">
                    {location || t('common/hosting_details_modal:default_location')}
                  </p>
                </div>
              </div>

              {/* Kashrut */}
              {kashrutLevel && (
                <div className="chat-modal-row">
                  <Utensils size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_kashrut')}</span>
                    <p className="chat-modal-value">{getKashrutLabel(kashrutLevel)}</p>
                  </div>
                </div>
              )}

              {/* Lodging */}
              <div className="chat-modal-row">
                <Moon size={18} className="chat-modal-row-icon" />
                <div>
                  <span className="chat-modal-label">{t('common/hosting_details_modal:label_lodging')}</span>
                  <p className="chat-modal-value">
                    {hasLodging ? t('common/hosting_details_modal:lodging_yes') : t('common/hosting_details_modal:lodging_no')}
                  </p>
                </div>
              </div>

              {/* Spots */}
              {(data.available_spots !== undefined || data.max_guests !== undefined) && (
                <div className="chat-modal-row">
                  <Users size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_spots')}</span>
                    <p className="chat-modal-value">
                      {data.available_spots !== undefined ? t('common/hosting_details_modal:spots_available', { count: data.available_spots }) : t('common/hosting_details_modal:spots_max', { count: data.max_guests })}
                    </p>
                  </div>
                </div>
              )}

              {/* Host House Notes */}
              {(cleanDescription || data.free_text_notes || data.biography) && (
                <div className="chat-modal-row">
                  <Info size={18} className="chat-modal-row-icon" />
                  <div>
                    <span className="chat-modal-label">{t('common/hosting_details_modal:label_host_notes')}</span>
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
            {t('common/hosting_details_modal:btn_close')}
          </button>
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(t('common/hosting_details_modal:whatsapp_message', { date: formatShortDate(hostingDate) || formatDate(hostingDate) || '' }))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-modal-btn-wa"
            >
              <WhatsAppIcon size={16} />
              {t('common/hosting_details_modal:btn_whatsapp')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
