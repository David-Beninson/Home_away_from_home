import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Settings, CalendarDays, LayoutList, Loader2 } from 'lucide-react';
import {
  openRulesModal,
  setViewMode,
  fetchAvailability,
} from '../../../store/availabilitySlice';
import { fetchPosts, fetchAllRequests } from '../../../store/requestsSlice';
import AvailabilityCalendar from '../../../components/HostDashboard/AvailabilityCalendar';
import DayDetailPanel from '../../../components/HostDashboard/DayDetailPanel';
import RulesSettingsModal from '../../../components/HostDashboard/RulesSettingsModal';
import { useTranslation } from 'react-i18next';
import './HomeHost.css';

export default function HomeHost() {
  const { t } = useTranslation(['host/dashboard']);
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { overrides, bookings, viewMode, loading, syncing, error } =
    useSelector((s) => s.availability);
  const badgeCount = useSelector((s) => s.requests.badgeCount);

  // ── Load from DB on mount & periodic auto-refresh ──
  useEffect(() => {
    dispatch(fetchAvailability());
    dispatch(fetchAllRequests());

    const interval = setInterval(() => {
      dispatch(fetchAvailability());
      dispatch(fetchAllRequests());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // ── Auto-switch to week view on narrow screens ──
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    if (mq.matches) dispatch(setViewMode('week'));
    const handler = (e) => dispatch(setViewMode(e.matches ? 'week' : 'month'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [dispatch]);

  const totalOverrides = Object.keys(overrides).length;
  const totalBookings = Object.keys(bookings).length;
  const firstName = user?.full_name?.split(' ')[0] || t('host/dashboard:hero.title').replace('👋', '').trim(); // fallback if not parsed well

  return (
    <div className="hh-container">

      {/* ── Hero ── */}
      <section className="hh-hero">
        <div className="hh-hero-content">
          <span className="hh-hero-subtitle">{t('host/dashboard:hero.subtitle')}</span>
          <h1 className="hh-hero-title">{t('host/dashboard:hero.title', { name: firstName })}</h1>
          <p className="hh-hero-info">{t('host/dashboard:hero.info')}</p>

          {syncing && (
            <span className="hh-sync-badge">
              <Loader2 size={12} className="hh-spin" /> {t('host/dashboard:hero.syncing')}
            </span>
          )}
          {error && !syncing && (
            <span className="hh-sync-badge hh-sync-badge--error">{t('host/dashboard:hero.error')}</span>
          )}
        </div>

        <div className="hh-hero-actions">
          <button
            id="hh-open-rules"
            className="hh-btn-settings"
            onClick={() => dispatch(openRulesModal())}
          >
            <Settings size={16} />
            {t('host/dashboard:hero.btn_settings')}
          </button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="hh-stats-row">
        <div className="hh-stat-card">
          <h2>{totalBookings}</h2>
          <p>{t('host/dashboard:stats.active')}</p>
        </div>
        <div className="hh-stat-card hh-stat-purple">
          <h2>{badgeCount}</h2>
          <p>{t('host/dashboard:stats.pending')}</p>
        </div>
        <div className="hh-stat-card hh-stat-yellow">
          <h2>0</h2>
          <p>{t('host/dashboard:stats.month')}</p>
        </div>
      </section>

      {/* ── Calendar ── */}
      <section className="hh-calendar-section">
        <div className="hh-calendar-header">
          <h2 className="hh-section-title">{t('host/dashboard:calendar.title')}</h2>

          <div className="hh-view-toggle">
            <button
              id="hh-toggle-month"
              className={`hh-toggle-btn ${viewMode === 'month' ? 'hh-toggle-btn--active' : ''}`}
              onClick={() => dispatch(setViewMode('month'))}
              aria-label={t('host/dashboard:calendar.btn_month')}
            >
              <CalendarDays size={16} /> {t('host/dashboard:calendar.btn_month')}
            </button>
            <button
              id="hh-toggle-week"
              className={`hh-toggle-btn ${viewMode === 'week' ? 'hh-toggle-btn--active' : ''}`}
              onClick={() => dispatch(setViewMode('week'))}
              aria-label={t('host/dashboard:calendar.btn_week')}
            >
              <LayoutList size={16} /> {t('host/dashboard:calendar.btn_week')}
            </button>
          </div>
        </div>

        <div className={`hh-calendar-card ${loading ? 'hh-calendar-card--loading' : ''}`}>
          {loading && !rules ? (
            <div className="hh-loading-skeleton">
              <div className="hh-skeleton-header" />
              <div className="hh-skeleton-grid">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="hh-skeleton-cell" />
                ))}
              </div>
            </div>
          ) : (
            <AvailabilityCalendar />
          )}
        </div>
      </section>

      <DayDetailPanel />
      <RulesSettingsModal />

    </div>
  );
}
