
import { Sparkles, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HomeGuestFeaturedHosts({ hosts, loading }) {
  const navigate = useNavigate();

  const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format';

  // Take top 4 hosts sorted by highest match score
  const topHosts = (hosts || []).slice(0, 4);

  return (
    <section className="gh-featured-section">
      <div className="gh-section-header">
        <h3>מארחים מובילים השבת</h3>
        <span 
          className="gh-link-all" 
          onClick={() => navigate('/find-host')}
        >
          כל המארחים
        </span>
      </div>

      {loading && (!topHosts || topHosts.length === 0) ? (
        <div className="gh-hosts-loading">
          טוען מארחים מומלצים...
        </div>
      ) : (
        <div className="gh-hosts-grid">
          {topHosts.map((host) => {
            const imageUrl = host.image_url || host.image || DEFAULT_IMAGE;
            const matchScore = host.match_percentage || host.match || 85;
            const isKosher = host.kashrut_level === 'MEHADRIN' || host.kosher;

            return (
              <div 
                className="gh-host-card" 
                key={host.id}
                onClick={() => navigate(`/hosts/${host.id}`)}
              >
                <div className="gh-card-image-wrapper">
                  <img 
                    src={imageUrl} 
                    alt={host.full_name || host.name} 
                    className="gh-card-image" 
                    onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
                  />
                  <div className="gh-card-badges">
                    {host.has_lodging && <span className="gh-badge-night">🌙 לינה</span>}
                    <div className="gh-badge-right-group">
                      {isKosher && <span className="gh-badge-kosher">🛡️ מהדרין</span>}
                      <span className="gh-badge-match">
                        <Sparkles size={12} /> {matchScore}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="gh-card-content">
                  <div className="gh-card-title-row">
                    <h4>{host.full_name || host.name}</h4>
                    <div className="gh-rating">
                      <Star size={14} fill="#eab308" color="#eab308" />
                      <span>{(host.rating || 5.0).toFixed(1)}</span>
                      {host.reviews !== undefined && (
                        <span className="gh-reviews">({host.reviews})</span>
                      )}
                    </div>
                  </div>

                  <div className="gh-location">
                    <MapPin size={14} /> {host.city || host.location}
                  </div>

                  <div className="gh-card-footer">
                    <div className="gh-tags">
                      {(host.tags || []).slice(0, 2).map((tag) => (
                        <span key={tag} className="gh-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="gh-spots-text">{host.available_spots || host.spots || 0} מקומות</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
