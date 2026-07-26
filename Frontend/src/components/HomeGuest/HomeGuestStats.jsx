

export default function HomeGuestStats({ stats, status, myPendingRequests }) {
  return (
    <section className="gh-stats-row">
      <div className="gh-stat-card">
        <h2>{status === 'loading' ? '...' : (stats?.availableHosts || 0)}</h2>
        <p>מארחים זמינים</p>
      </div>
      <div className="gh-stat-card gh-stat-green">
        <h2>{status === 'loading' ? '...' : (stats?.availableSpots || 0)}</h2>
        <p>מקומות פנויים</p>
      </div>
      <div className="gh-stat-card gh-stat-purple">
        <h2>{myPendingRequests || 0}</h2>
        <p>הבקשות שלי</p>
      </div>
      <div className="gh-stat-card gh-stat-yellow">
        <h2>{status === 'loading' ? '...' : (stats?.hostsWithSleepover || 0)}</h2>
        <p>מארחים עם לינה</p>
      </div>
    </section>
  );
}
