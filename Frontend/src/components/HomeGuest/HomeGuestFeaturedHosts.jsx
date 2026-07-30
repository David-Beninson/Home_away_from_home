
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HostCard } from '../Common/HostCard';

export default function HomeGuestFeaturedHosts({ hosts, loading }) {
  const { t } = useTranslation(['guest/home']);
  const navigate = useNavigate();

  const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format';

  // Take top 4 hosts sorted by highest match score
  const topHosts = (hosts || []).slice(0, 4);

  return (
    <section className="gh-featured-section">
      <div className="gh-section-header">
        <h3>{t('guest/home:featured.title')}</h3>
        <span
          className="gh-link-all"
          onClick={() => navigate('/find-host')}
        >
          {t('guest/home:featured.view_all')}
        </span>
      </div>

      {loading && (!topHosts || topHosts.length === 0) ? (
        <div className="gh-hosts-loading">
          {t('guest/home:featured.loading')}
        </div>
      ) : (
        <div className="gh-hosts-grid">
          {topHosts.map((host) => (
            <HostCard key={host.id} host={host} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
