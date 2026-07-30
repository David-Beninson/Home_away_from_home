import { useState } from 'react';
import { X, Calendar, Users, FileText, Gift, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './BookingRequestModal.css';

function formatDateLabel(dInput, t) {
  let d;
  if (typeof dInput === 'string' && dInput.includes('-')) {
    const parts = dInput.split('T')[0].split('-').map(Number);
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(dInput);
  }
  if (isNaN(d.getTime())) return String(dInput);
  
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  return t('guest/host_details:booking_modal.date_format', {
    day: t(`guest/host_details:booking_modal.days.${days[d.getDay()]}`),
    date: d.getDate(),
    month: t(`guest/host_details:booking_modal.months.${months[d.getMonth()]}`)
  });
}

export default function BookingRequestModal({
  isOpen,
  onClose,
  host,
  onSubmit,
  isSubmitting
}) {
  const { t } = useTranslation(['guest/host_details']);

  if (!isOpen || !host) return null;

  // Extract available dates list from host profile
  const availableDatesList = (() => {
    const dates = host.upcoming_open_dates || host.open_dates;
    if (Array.isArray(dates) && dates.length > 0) {
      return dates;
    }
    const single = host.shabbat_date || host.date || host.requested_date || host.available_date;
    return single ? [single] : [new Date().toISOString().split('T')[0]];
  })();

  const [selectedDates, setSelectedDates] = useState(availableDatesList);
  const [guestsCount, setGuestsCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [inReturn, setInReturn] = useState('');

  const handleDateToggle = (dStr) => {
    if (selectedDates.includes(dStr)) {
      if (selectedDates.length === 1) return; // keep at least 1 checked
      setSelectedDates(selectedDates.filter(d => d !== dStr));
    } else {
      setSelectedDates([...selectedDates, dStr]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sortedSelected = [...selectedDates].sort();
    const primaryDate = sortedSelected[0] || availableDatesList[0];

    const descriptionParts = [];
    if (inReturn.trim()) {
      descriptionParts.push(`מביאים לאירוח: ${inReturn.trim()}`);
    }
    if (notes.trim()) {
      descriptionParts.push(notes.trim());
    }

    onSubmit({
      selectedDate: primaryDate,
      selectedDates: sortedSelected,
      guestsCount,
      inReturn: inReturn.trim(),
      notes: descriptionParts.join('\n')
    });
  };

  const maxSpots = (host.available_spots !== undefined && host.available_spots > 0)
    ? host.available_spots
    : (host.max_guests || host.total_spots || 4);

  const hostName = host.full_name || host.host_name || host.user?.full_name || t('guest/host_details:page.default_host');

  return (
    <div className="brm-overlay" onClick={onClose}>
      <div className="brm-modal" onClick={(e) => e.stopPropagation()} dir="rtl">

        {/* Modal Header */}
        <div className="brm-header">
          <div>
            <h2 className="brm-title">{t('guest/host_details:booking_modal.title')}</h2>
            <p className="brm-subtitle">{t('guest/host_details:booking_modal.subtitle', { name: hostName })}</p>
          </div>
          <button className="brm-close-btn" onClick={onClose} aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="brm-form">

          {/* 1. Multi-select Checkboxes for Dates */}
          <div className="brm-field-group">
            <label className="brm-label">
              <Calendar size={18} className="brm-icon" />
              <span>{t('guest/host_details:booking_modal.label_dates')}</span>
            </label>
            <div className="brm-date-options">
              {availableDatesList.map((dStr) => {
                const isChecked = selectedDates.includes(dStr);
                return (
                  <label
                    key={dStr}
                    className={`brm-date-card ${isChecked ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDateToggle(dStr);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="brm-checkbox"
                    />
                    <div className="brm-date-info">
                      <span className="brm-date-text">{formatDateLabel(dStr, t)}</span>
                      <span className="brm-date-subtext">{t('guest/host_details:booking_modal.label_date_type')}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 2. Number of Guests Selection (Range Slider) */}
          <div className="brm-field-group">
            <div className="brm-label-row">
              <label className="brm-label">
                <Users size={18} className="brm-icon" />
                <span>{t('guest/host_details:booking_modal.label_guests')}</span>
              </label>
              <span className="brm-slider-value">
                {guestsCount === 1 ? t('guest/host_details:booking_modal.guests_1') : t('guest/host_details:booking_modal.guests_count', { count: guestsCount })}
              </span>
            </div>
            
            <div className="brm-slider-wrapper">
              <input
                type="range"
                min="1"
                max={maxSpots}
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
                className="brm-range-slider"
                style={{
                  '--slider-fill': `${maxSpots > 1 ? ((guestsCount - 1) / (maxSpots - 1)) * 100 : 100}%`
                }}
              />
              <div className="brm-slider-labels">
                <span>{t('guest/host_details:booking_modal.guests_1')}</span>
                <span>{t('guest/host_details:booking_modal.guests_max', { count: maxSpots })}</span>
              </div>
            </div>
          </div>

          {/* 3. Bringing something / Giving in return (Optional) */}
          <div className="brm-field-group">
            <label className="brm-label">
              <Gift size={18} className="brm-icon" />
              <span>{t('guest/host_details:booking_modal.label_in_return')}</span>
            </label>
            <input
              type="text"
              value={inReturn}
              onChange={(e) => setInReturn(e.target.value)}
              placeholder={t('guest/host_details:booking_modal.placeholder_in_return')}
              className="brm-select"
            />
          </div>

          {/* 4. Notes / Special Request */}
          <div className="brm-field-group">
            <label className="brm-label">
              <FileText size={18} className="brm-icon" />
              <span>{t('guest/host_details:booking_modal.label_notes')}</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('guest/host_details:booking_modal.placeholder_notes')}
              className="brm-textarea"
              rows={2}
            />
          </div>

          {/* Modal Actions */}
          <div className="brm-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="brm-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  <span>{t('guest/host_details:booking_modal.btn_submitting')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{t('guest/host_details:booking_modal.btn_submit')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="brm-cancel-btn"
              disabled={isSubmitting}
            >
              {t('guest/host_details:booking_modal.btn_cancel')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
