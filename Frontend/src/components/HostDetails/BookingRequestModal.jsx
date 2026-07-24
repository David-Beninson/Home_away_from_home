import { useState } from 'react';
import { X, Calendar, Users, FileText, Gift, CheckCircle2, Loader2 } from 'lucide-react';
import './BookingRequestModal.css';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'
];

function formatDateLabel(dInput) {
  let d;
  if (typeof dInput === 'string' && dInput.includes('-')) {
    const parts = dInput.split('T')[0].split('-').map(Number);
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date(dInput);
  }
  if (isNaN(d.getTime())) return String(dInput);
  return `יום ${HEBREW_DAYS[d.getDay()]}, ${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]}`;
}

export default function BookingRequestModal({
  isOpen,
  onClose,
  host,
  onSubmit,
  isSubmitting
}) {
  if (!isOpen || !host) return null;

  // Extract available dates list from host profile
  const availableDatesList = (() => {
    const dates = host.upcoming_open_dates || host.open_dates;
    if (Array.isArray(dates) && dates.length > 0) {
      return dates;
    }
    const single = host.date || host.shabbat_date || host.requested_date;
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

  const maxSpots = host.available_spots && host.available_spots > 0 ? host.available_spots : 4;

  return (
    <div className="brm-overlay" onClick={onClose}>
      <div className="brm-modal" onClick={(e) => e.stopPropagation()} dir="rtl">

        {/* Modal Header */}
        <div className="brm-header">
          <div>
            <h2 className="brm-title">שליחת בקשת אירוח</h2>
            <p className="brm-subtitle">מארח: {host.full_name || 'משפחה מארחת'}</p>
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
              <span>בחר תאריכים / לילות אירוח (ניתן לסמן מספר תאריכים):</span>
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
                      <span className="brm-date-text">{formatDateLabel(dStr)}</span>
                      <span className="brm-date-subtext">אירוח ולינה</span>
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
                <span>כמה חבר'ה מגיעים?</span>
              </label>
              <span className="brm-slider-value">
                {guestsCount} חבר'ה
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
                <span>חבר'ה 1</span>
                <span>עד {maxSpots} חבר'ה פנויים</span>
              </div>
            </div>
          </div>

          {/* 3. Bringing something / Giving in return (Optional) */}
          <div className="brm-field-group">
            <label className="brm-label">
              <Gift size={18} className="brm-icon" />
              <span>אם אתם מביאים משהו או רוצים לתת – תכתבו פה (אופציונלי):</span>
            </label>
            <input
              type="text"
              value={inReturn}
              onChange={(e) => setInReturn(e.target.value)}
              placeholder="למשל: נביא עוגה לשבת, יין, נעזור בהכנות..."
              className="brm-select"
            />
          </div>

          {/* 4. Notes / Special Request */}
          <div className="brm-field-group">
            <label className="brm-label">
              <FileText size={18} className="brm-icon" />
              <span>הערות נוספות (אופציונלי):</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="למשל: נגיע ביום שישי בצהריים, שומרים כשרות למהדרין..."
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
                  <span>שולח בקשה...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>אישור ושליחת בקשת אירוח</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="brm-cancel-btn"
              disabled={isSubmitting}
            >
              ביטול
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
