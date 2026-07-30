import  { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, Calendar, Lock, Settings } from 'lucide-react';
import { setRules, closeRulesModal } from '../../store/availabilitySlice';
import { useTranslation } from 'react-i18next';

const WEEKDAY_LABELS = [
  { dow: 0, label: 'ראשון' },
  { dow: 1, label: 'שני' },
  { dow: 2, label: 'שלישי' },
  { dow: 3, label: 'רביעי' },
  { dow: 4, label: 'חמישי' },
];

const WEEKEND_DAYS_OPTIONS = [
  { value: [4, 5, 6], labelKey: 'weekend_thu_fri_sat' },
  { value: [5, 6],    labelKey: 'weekend_fri_sat' },
  { value: [6],       labelKey: 'weekend_sat' },
];

function arraysEqual(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export default function RulesSettingsModal() {
  const dispatch = useDispatch();
  const { t } = useTranslation(['host/dashboard']);
  const { rules, rulesModalOpen } = useSelector((s) => s.availability);

  const [draft, setDraft] = useState(rules);

  useEffect(() => {
    if (rulesModalOpen) setDraft(rules);
  }, [rulesModalOpen, rules]);

  if (!rulesModalOpen) return null;

  const handleClose = () => dispatch(closeRulesModal());
  const handleSave = () => {
    dispatch(setRules(draft));
    dispatch(closeRulesModal());
  };

  const toggleWeekday = (dow) => {
    const next = draft.weekdayOpenDays.includes(dow)
      ? draft.weekdayOpenDays.filter((d) => d !== dow)
      : [...draft.weekdayOpenDays, dow];
    setDraft((p) => ({ ...p, weekdayOpenDays: next }));
  };

  const WEEKEND_PATTERN_OPTIONS = [
    { value: 'every',    label: t('host/dashboard:rules_modal.pattern_every'),                desc: t('host/dashboard:rules_modal.pattern_every_desc') },
    { value: 'biweekly', label: t('host/dashboard:rules_modal.pattern_biweekly'), desc: t('host/dashboard:rules_modal.pattern_biweekly_desc') },
    { value: 'monthly',  label: t('host/dashboard:rules_modal.pattern_monthly'),               desc: t('host/dashboard:rules_modal.pattern_monthly_desc') },
    { value: 'never',    label: t('host/dashboard:rules_modal.pattern_never'),               desc: t('host/dashboard:rules_modal.pattern_never_desc') },
  ];

  const MONTHLY_OPTIONS = [1, 2, 3, 4].map((n) => ({
    value: n,
    label: t(`host/dashboard:rules_modal.sub_monthly_opts.${n}`)
  }));

  return (
    <div className="rsm-backdrop" role="dialog" aria-modal="true" aria-label={t('host/dashboard:rules_modal.title')}>
      <div className="rsm-modal">

        {/* Header */}
        <div className="rsm-modal-header">
          <div className="rsm-header-left">
            <div className="rsm-header-icon"><Settings size={20} /></div>
            <div>
              <h2>{t('host/dashboard:rules_modal.title')}</h2>
              <p>{t('host/dashboard:rules_modal.subtitle')}</p>
            </div>
          </div>
          <button id="rsm-close" className="rsm-close-btn" onClick={handleClose} aria-label={t('host/dashboard:rules_modal.btn_cancel')}>
            <X size={20} />
          </button>
        </div>

        <div className="rsm-modal-body">

          {/* 1. Weekend Pattern */}
          <section className="rsm-section">
            <h3 className="rsm-section-title"><Calendar size={16} /> {t('host/dashboard:rules_modal.section_pattern_title')}</h3>
            <div className="rsm-pattern-grid">
              {WEEKEND_PATTERN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  id={`rsm-pattern-${opt.value}`}
                  className={`rsm-pattern-card ${draft.weekendPattern === opt.value ? 'rsm-pattern-card--active' : ''}`}
                  onClick={() => setDraft((p) => ({ ...p, weekendPattern: opt.value }))}
                >
                  <span className="rsm-pattern-label">{opt.label}</span>
                  <span className="rsm-pattern-desc">{opt.desc}</span>
                </button>
              ))}
            </div>

            {draft.weekendPattern === 'monthly' && (
              <div className="rsm-sub-option">
                <label className="rsm-sub-label">{t('host/dashboard:rules_modal.sub_monthly_label')}</label>
                <div className="rsm-radio-row">
                  {MONTHLY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="rsm-radio-label">
                      <input type="radio" name="monthlyOccurrence" value={opt.value}
                        checked={draft.monthlyOccurrence === opt.value}
                        onChange={() => setDraft((p) => ({ ...p, monthlyOccurrence: opt.value }))} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {draft.weekendPattern === 'biweekly' && (
              <div className="rsm-sub-option">
                <label className="rsm-sub-label">{t('host/dashboard:rules_modal.sub_biweekly_label')}</label>
                <div className="rsm-radio-row">
                  {[{ v: 0, l: t('host/dashboard:rules_modal.sub_biweekly_even') }, { v: 1, l: t('host/dashboard:rules_modal.sub_biweekly_odd') }].map(({ v, l }) => (
                    <label key={v} className="rsm-radio-label">
                      <input type="radio" name="biweeklyParity"
                        checked={draft.biweeklyParity === v}
                        onChange={() => setDraft((p) => ({ ...p, biweeklyParity: v }))} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. Weekend Definition */}
          <section className="rsm-section">
            <h3 className="rsm-section-title">{t('host/dashboard:rules_modal.section_weekend_title')}</h3>
            <div className="rsm-weekend-days-grid">
              {WEEKEND_DAYS_OPTIONS.map((opt) => (
                <button key={opt.labelKey}
                  className={`rsm-pattern-card ${arraysEqual(draft.weekendDays, opt.value) ? 'rsm-pattern-card--active' : ''}`}
                  onClick={() => setDraft((p) => ({ ...p, weekendDays: opt.value }))}>
                  <span className="rsm-pattern-label">{t(`host/dashboard:rules_modal.${opt.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 3. Weekday Open Days */}
          <section className="rsm-section">
            <h3 className="rsm-section-title">{t('host/dashboard:rules_modal.section_weekday_title')}</h3>
            <p className="rsm-section-hint">{t('host/dashboard:rules_modal.section_weekday_hint')}</p>
            <div className="rsm-weekday-checks">
              {WEEKDAY_LABELS.map(({ dow }) => (
                <label key={dow} className={`rsm-day-check ${draft.weekdayOpenDays.includes(dow) ? 'rsm-day-check--active' : ''}`}>
                  <input type="checkbox" checked={draft.weekdayOpenDays.includes(dow)} onChange={() => toggleWeekday(dow)} />
                  {t(`host/dashboard:rules_modal.weekday_names.${dow}`)}
                </label>
              ))}
            </div>
          </section>

          {/* 4. Notice Period */}
          <section className="rsm-section">
            <h3 className="rsm-section-title"><Lock size={16} /> {t('host/dashboard:rules_modal.section_notice_title')}</h3>
            <p className="rsm-section-hint">{t('host/dashboard:rules_modal.section_notice_hint')}</p>
            <div className="rsm-notice-row">
              <label className="rsm-notice-label">{t('host/dashboard:rules_modal.notice_label')}</label>
              <select className="rsm-notice-select" value={draft.noticeCutoffHour}
                onChange={(e) => setDraft((p) => ({ ...p, noticeCutoffHour: Number(e.target.value) }))}>
                {[8, 10, 12, 14, 16, 18, 24].map((h) => (
                  <option key={h} value={h}>{h === 24 ? t('host/dashboard:rules_modal.notice_opt_none') : `${h}:00`}</option>
                ))}
              </select>
            </div>
          </section>

          {/* 5. Calendar Sync Placeholder */}
          <section className="rsm-section">
            <h3 className="rsm-section-title">{t('host/dashboard:rules_modal.section_sync_title')}</h3>
            <div className="rsm-sync-card">
              <div className="rsm-sync-info">
                <p className="rsm-sync-title">{t('host/dashboard:rules_modal.sync_subtitle')}</p>
                <p className="rsm-sync-desc">{t('host/dashboard:rules_modal.sync_desc')}</p>
              </div>
              <div className="rsm-coming-soon-wrapper">
                <button id="rsm-sync-btn" className="rsm-sync-btn" disabled>
                  {t('host/dashboard:rules_modal.btn_sync')}
                </button>
                <span className="rsm-coming-soon-badge">{t('host/dashboard:rules_modal.badge_coming_soon')}</span>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="rsm-modal-footer">
          <button id="rsm-cancel" className="rsm-btn-cancel" onClick={handleClose}>{t('host/dashboard:rules_modal.btn_cancel')}</button>
          <button id="rsm-save" className="rsm-btn-save" onClick={handleSave}>{t('host/dashboard:rules_modal.btn_save')}</button>
        </div>

      </div>
    </div>
  );
}
