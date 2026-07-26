import { useState } from 'react';
import { postsApi } from '../../api/api';
import DateRangePicker from '../Common/DateRangePicker/DateRangePicker';
import './CreatePostModal.css';

export default function CreatePostModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [dateRange, setDateRange] = useState(() => {
    if (initialData?.requested_date || initialData?.start_date) {
      const s = new Date(initialData.start_date || initialData.requested_date);
      const e = initialData.end_date ? new Date(initialData.end_date) : null;
      return { startDate: s, endDate: e, nightsCount: initialData.nights_count || 0 };
    }
    return { startDate: getDefaultDate(), endDate: null, nightsCount: 0 };
  });

  const [description, setDescription] = useState(initialData?.description || '');
  const [guestsCount, setGuestsCount] = useState(initialData?.guests_count || 1);
  const [region, setRegion] = useState(initialData?.region || 'מרכז');
  const [kashrut, setKashrut] = useState(initialData?.kashrut || 'כשר');
  const [needsLodging, setNeedsLodging] = useState(initialData?.needs_lodging || false);
  const [isAnonymous, setIsAnonymous] = useState(initialData?.is_anonymous ?? true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const isEdit = Boolean(initialData && initialData.id);

  const resetForm = () => {
    setDateRange({
      startDate: getDefaultDate(),
      endDate: null,
      nightsCount: 0,
    });
    setDescription('');
    setGuestsCount(1);
    setRegion('מרכז');
    setKashrut('כשר');
    setNeedsLodging(false);
    setIsAnonymous(true);
    setShowDatePicker(false);
    setError(null);
  };

  const handleDateRangeChange = ({ startDate, endDate, nightsCount }) => {
    setDateRange({ startDate, endDate, nightsCount });
    // Automatically close the date picker once both start and end dates are selected
    if (startDate && endDate) {
      setShowDatePicker(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('אנא הזן תיאור לבקשת האירוח');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const startIso = (dateRange.startDate || getDefaultDate()).toISOString();
      const endIso = dateRange.endDate ? dateRange.endDate.toISOString() : null;

      const payload = {
        requested_date: startIso,
        start_date: startIso,
        end_date: endIso,
        nights_count: dateRange.nightsCount,
        description: description.trim(),
        guests_count: Number(guestsCount),
        region,
        kashrut,
        needs_lodging: needsLodging,
        is_anonymous: isAnonymous,
      };

      if (isEdit) {
        await postsApi.update(initialData.id, payload);
      } else {
        await postsApi.create(payload);
      }

      resetForm();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save post:', err);
      setError(err.response?.data?.detail || 'שגיאה בשמירת הבקשה');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDateLabel = () => {
    if (!dateRange.startDate) return 'בחירת תאריכים';
    const startStr = dateRange.startDate.toLocaleDateString('he-IL');
    if (!dateRange.endDate) return `הגעה: ${startStr}`;
    const endStr = dateRange.endDate.toLocaleDateString('he-IL');
    const nights = dateRange.nightsCount > 0 ? ` (${dateRange.nightsCount} לילות)` : '';
    return `${startStr} - ${endStr}${nights}`;
  };

  return (
    <div className="cpm-inline-wrapper" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4 cpm-inline-card">
        {error && <div className="cpm-error">{error}</div>}

        <div className="cpm-inline-header">
          <h3 className="font-bold text-foreground text-right">
            {isEdit ? 'עריכת בקשת אירוח' : 'פרסם בקשת אירוח חדשה'}
          </h3>
          <button
            type="button"
            className="cpm-toggle-picker-btn"
            onClick={() => setShowDatePicker((prev) => !prev)}
          >
            📅 {formattedDateLabel()}
          </button>
        </div>

        <textarea
          placeholder="תאר את עצמך ומה אתה מחפש בשבת..."
          rows="3"
          dir="rtl"
          className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {isAnonymous && (
          <div className="cpm-anonymous-tip">
            💡 <strong>פרסום אנונימי:</strong> השם שלך לא יוצג למארחים. מומלץ לפרט בתיאור ככל הניתן (ללא פרטים מזהים) על מנת להעלות את הסיכוי שמארחים יאשרו את האירוח.
          </div>
        )}

        {/* Date Range Picker Container */}
        {showDatePicker && (
          <div className="cpm-picker-container">
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={handleDateRangeChange}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 cpm-fields-grid">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1 text-right">אזור</label>
            <select
              dir="rtl"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="מרכז">מרכז</option>
              <option value="ירושלים">ירושלים</option>
              <option value="צפון">צפון</option>
              <option value="דרום">דרום</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1 text-right">כשרות</label>
            <select
              dir="rtl"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              value={kashrut}
              onChange={(e) => setKashrut(e.target.value)}
            >
              <option value="כשר">כשר</option>
              <option value="מהדרין">מהדרין</option>
              <option value="רגיל">רגיל</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1 text-right">מספר אורחים</label>
            <input
              type="number"
              min="1"
              max="8"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              value={guestsCount}
              onChange={(e) => setGuestsCount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col justify-end gap-2 cpm-checkboxes">
            <label className="flex items-center gap-2 cursor-pointer justify-end">
              <span className="text-xs text-muted-foreground">לינה נדרשת</span>
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={needsLodging}
                onChange={(e) => setNeedsLodging(e.target.checked)}
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer justify-end">
              <span className="text-xs text-muted-foreground">אנונימי</span>
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end cpm-actions">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary cpm-btn-cancel"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-40 hover:opacity-90 cpm-btn-submit"
          >
            {submitting ? (isEdit ? 'שומר...' : 'מפרסם...') : (isEdit ? 'עדכן בקשה' : 'פרסם')}
          </button>
        </div>
      </form>
    </div>
  );
}
