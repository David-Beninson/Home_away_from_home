import { useState } from 'react';
import { Edit3, Clock, X, Check, Loader2 } from 'lucide-react';
import DateRangePicker from '../Common/DateRangePicker/DateRangePicker';
import { postsApi } from '../../api/api';
import { useTranslation } from 'react-i18next';
import { SelectFilter } from '../Common/SelectFilter';

export default function RequestInlineEdit({ post, onCancel, onSuccess }) {
  const { t } = useTranslation(['guest/requests']);
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [dateRange, setDateRange] = useState(() => {
    const s = post.start_date || post.requested_date ? new Date(post.start_date || post.requested_date) : getDefaultDate();
    const e = post.end_date ? new Date(post.end_date) : null;
    return { startDate: s, endDate: e, nightsCount: post.nights_count || 0 };
  });

  const [description, setDescription] = useState(post.description || '');
  const [guestsCount, setGuestsCount] = useState(post.guests_count || 1);
  const [region, setRegion] = useState(post.region || 'מרכז');
  const [kashrut, setKashrut] = useState(post.kashrut || 'כשר');
  const [needsLodging, setNeedsLodging] = useState(post.needs_lodging || false);
  const [isAnonymous, setIsAnonymous] = useState(post.is_anonymous ?? true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSaveInline = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('guest/requests:inline_edit.error_desc'));
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      const startIso = dateRange.startDate.toISOString();
      const endIso = dateRange.endDate ? dateRange.endDate.toISOString() : null;

      await postsApi.update(post.id, {
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
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to update post:', err);
      setError(err.response?.data?.detail || t('guest/requests:inline_edit.error_update'));
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDateLabel = () => {
    if (!dateRange.startDate) return t('guest/requests:inline_edit.date_picker_default');
    const startStr = dateRange.startDate.toLocaleDateString('he-IL');
    if (!dateRange.endDate) return t('guest/requests:inline_edit.date_arrival', { date: startStr });
    const endStr = dateRange.endDate.toLocaleDateString('he-IL');
    const nights = dateRange.nightsCount > 0 ? t('guest/requests:inline_edit.date_nights', { count: dateRange.nightsCount }) : '';
    return `${startStr} - ${endStr}${nights}`;
  };

  return (
    <div className="request-card inline-edit-card" dir="rtl">
      <form onSubmit={handleSaveInline} className="inline-edit-form">
        <div className="inline-edit-header">
          <div className="inline-edit-title-group">
            <div className="inline-edit-icon-badge">
              <Edit3 size={16} />
            </div>
            <h4>{t('guest/requests:inline_edit.title')}</h4>
          </div>
          <button
            type="button"
            className="inline-edit-date-btn"
            onClick={() => setShowDatePicker((prev) => !prev)}
          >
            <Clock size={14} />
            <span>{formattedDateLabel()}</span>
          </button>
        </div>

        {error && <div className="cpm-error text-xs">{error}</div>}

        <div className="inline-edit-body">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            dir="rtl"
            className="inline-edit-textarea"
            placeholder={t('guest/requests:inline_edit.placeholder_desc')}
            required
          />

          {showDatePicker && (
            <div className="cpm-picker-container">
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onChange={({ startDate, endDate, nightsCount }) => {
                  setDateRange({ startDate, endDate, nightsCount });
                  if (startDate && endDate) setShowDatePicker(false);
                }}
              />
            </div>
          )}

          <div className="inline-edit-fields-grid">
            <div className="inline-field-group">
              <label>{t('guest/requests:inline_edit.label_region')}</label>
              <SelectFilter
                dir="rtl"
                value={region}
                onChange={setRegion}
                className="inline-edit-select"
                options={[
                  { value: 'מרכז', label: t('guest/requests:inline_edit.regions.center') },
                  { value: 'ירושלים', label: t('guest/requests:inline_edit.regions.jerusalem') },
                  { value: 'צפון', label: t('guest/requests:inline_edit.regions.north') },
                  { value: 'דרום', label: t('guest/requests:inline_edit.regions.south') }
                ]}
              />
            </div>

            <div className="inline-field-group">
              <label>{t('guest/requests:inline_edit.label_kashrut')}</label>
              <SelectFilter
                dir="rtl"
                value={kashrut}
                onChange={setKashrut}
                className="inline-edit-select"
                options={[
                  { value: 'כשר', label: t('guest/requests:inline_edit.kashrut_options.kosher') },
                  { value: 'מהדרין', label: t('guest/requests:inline_edit.kashrut_options.mehadrin') },
                  { value: 'רגיל', label: t('guest/requests:inline_edit.kashrut_options.regular') }
                ]}
              />
            </div>

            <div className="inline-field-group">
              <label>{t('guest/requests:inline_edit.label_guests')}</label>
              <input
                type="number"
                min="1"
                max="8"
                value={guestsCount}
                onChange={(e) => setGuestsCount(e.target.value)}
                className="inline-edit-input"
              />
            </div>

            <div className="inline-edit-toggles">
              <label className="inline-toggle-label">
                <input
                  type="checkbox"
                  checked={needsLodging}
                  onChange={(e) => setNeedsLodging(e.target.checked)}
                />
                <span>{t('guest/requests:inline_edit.label_lodging')}</span>
              </label>

              <label className="inline-toggle-label">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <span>{t('guest/requests:inline_edit.label_anonymous')}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="inline-edit-actions">
          <button
            type="button"
            onClick={onCancel}
            className="inline-btn-cancel"
          >
            <X size={15} />
            <span>{t('guest/requests:inline_edit.btn_cancel')}</span>
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-btn-save"
          >
            {submitting ? (
              <Loader2 size={15} className="spin-icon" />
            ) : (
              <Check size={15} />
            )}
            <span>{submitting ? t('guest/requests:inline_edit.btn_saving') : t('guest/requests:inline_edit.btn_save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
