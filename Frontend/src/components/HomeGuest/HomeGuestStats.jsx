import { useTranslation } from 'react-i18next';

export default function HomeGuestStats({ stats, status, myPendingRequests }) {
  const { t } = useTranslation(['guest/home']);
  return (
    <section className="gh-stats-row">
      <div className="gh-stat-card">
        <h2>{status === 'loading' ? '...' : (stats?.availableHosts || 0)}</h2>
        <p>{t('guest/home:stats.available_hosts')}</p>
      </div>
      <div className="gh-stat-card gh-stat-green">
        <h2>{status === 'loading' ? '...' : (stats?.availableSpots || 0)}</h2>
        <p>{t('guest/home:stats.available_spots')}</p>
      </div>
      <div className="gh-stat-card gh-stat-purple">
        <h2>{myPendingRequests || 0}</h2>
        <p>{t('guest/home:stats.my_requests')}</p>
      </div>
      <div className="gh-stat-card gh-stat-yellow">
        <h2>{status === 'loading' ? '...' : (stats?.hostsWithSleepover || 0)}</h2>
        <p>{t('guest/home:stats.hosts_with_sleepover')}</p>
      </div>
    </section>
  );
}
