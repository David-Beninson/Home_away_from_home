
import HostCard from '../HostCard/HostCard';
import EmptyResultsState from './EmptyResultsState';

export default function HostsGrid({
  hosts,
  loading,
  error,
  onRetry,
  onBookingRequest,
  onResetFilters
}) {
  if (error) {
    return (
      <div className="alert alert-danger hosts-grid-error">
        <span>{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="hosts-grid-retry-btn"
          >
            נסה שנית
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hosts-grid-loading">
        <p>טוען מארחים מתוך בסיס הנתונים...</p>
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
