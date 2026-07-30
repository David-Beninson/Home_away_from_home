import React from 'react';
import { Sparkles, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format';

export function HostCard({ host, t }) {
  const navigate = useNavigate();

  const imageUrl = host.image_url || host.image || DEFAULT_IMAGE;
  const matchScore = host.match_percentage || host.match || 85;
  const isKosher = host.kashrut_level === 'MEHADRIN' || host.kosher;
  const rating = host.rating || 5.0;

  return (
    <div
      className="gh-host-card"
      onClick={() => navigate(`/host/${host.id}`)}
    >
      <div className="gh-card-image-wrapper">
        <img
          src={imageUrl}
          alt={host.full_name || host.name}
          className="gh-card-image"
          onError={(e) => { e.target.src = DEFAULT_IMAGE; }}
        />
        <div className="gh-card-badges">
          {host.has_lodging && (
            <span className="gh-badge-night">🌙 {t('badges.sleepover', { defaultValue: 'לינה' })}</span>
          )}
          <div className="gh-badge-right-group">
            {isKosher && (
              <span className="gh-badge-kosher">🛡️ {t('badges.mehadrin', { defaultValue: 'מהדרין' })}</span>
            )}
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
            <span>{rating.toFixed(1)}</span>
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
          <div className="gh-spots-text">
            {host.available_spots || host.spots || 0} {t('featured.spots', { defaultValue: 'מקומות' })}
          </div>
        </div>
      </div>
    </div>
  );
}
