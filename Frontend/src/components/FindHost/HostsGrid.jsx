
import HostCard from '../HostCard/HostCard';
import EmptyResultsState from './EmptyResultsState';
import { useTranslation } from 'react-i18next';

export default function HostsGrid({
  hosts,
  loading,
  error,
  onRetry,
  onBookingRequest,
  onResetFilters
}) {
  const { t } = useTranslation(['guest/find_host']);
  if (error) {
    return (
      <div className="alert alert-danger hosts-grid-error">
        <span>{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="hosts-grid-retry-btn"
          >
            {t('guest/find_host:grid.retry')}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hosts-grid-loading">
        <p>{t('guest/find_host:grid.loading')}</p>
      </div>
    );
  }

  if (!hosts || hosts.length === 0) {
    return <EmptyResultsState onResetFilters={onResetFilters} />;
  }

  return (
    <main className="hosts-grid-container">
      {hosts.map((host) => (
        <HostCard
          key={host.id}
          host={host}
          onBookingRequest={onBookingRequest}
        />
      ))}
    </main>
  );
}
