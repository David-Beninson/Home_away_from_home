
import { Star, MapPin } from 'lucide-react';
import HostCardMedia from './HostCardMedia';
import { useTranslation } from 'react-i18next';
import './HostCard.css';

export default function HostCard({ host, onBookingRequest }) {
  const { t } = useTranslation(['common/host_card']);

  if (!host) return null;

  const fullName = host.full_name || host.host_name ;
  const rating = host.rating !== undefined && host.rating !== null ? Number(host.rating).toFixed(1) : '4.9';
  const reviewsCount = host.reviews_count ?? host.review_count ?? 47;
  const city = host.city || t('common/host_card:default_city');
  const hasOpenDays = host.upcoming_open_days && host.upcoming_open_days.length > 0;
  const availableSpots = hasOpenDays
    ? (host.available_spots !== undefined && host.available_spots !== null ? host.available_spots : 2)
    : 0;
  const tags = host.tags && host.tags.length > 0 ? host.tags : ['ילדים', 'חם ומשפחתי']; // These could also be translated if dynamic, leaving for now as tags are user-defined.

  const isDisabled = availableSpots <= 0;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => !isDisabled && onBookingRequest && onBookingRequest(host)}
      className={`host-card-button ${isDisabled ? 'host-card-button--disabled' : ''}`}
    >
      {/* 1. Media Header (Image, Badges, Overlay Gradient) */}
      <HostCardMedia host={host} />

      {/* 2. Main Content Details */}
      <div className="card-body-container">
        {/* Row 1: Rating (Left in RTL) & Name (Right in RTL) */}
        <div className="card-row-header">
          <span className="card-rating-group">
            <Star size={16} className="star-icon-amber" />
            <span className="card-rating-score">
              {rating}
            </span>
            <span className="card-rating-count">
              ({reviewsCount})
            </span>
          </span>

          <h3 className="card-title-name">
            {fullName}
          </h3>
        </div>

        {/* Row 2: Location */}
        <div className="card-row-location">
          <MapPin size={14} className="location-icon" />
          {city}
        </div>

        {/* Row 2.5: Upcoming Week Availability */}
        {host.upcoming_open_days && host.upcoming_open_days.length > 0 ? (
          <div className="upcoming-open-days">
            {t('common/host_card:upcoming_days', { days: host.upcoming_open_days.join(', ') })}
          </div>
        ) : (
          <div className="upcoming-no-spots">
            {t('common/host_card:no_spots_upcoming')}
          </div>
        )}

        {/* Row 3: Available Spots (Right) & Tags (Left) */}
        <div className="card-row-footer">
          <span className={`card-spots-text ${availableSpots > 0 ? 'text-amber' : 'text-red'}`}>
            {availableSpots > 0 ? t('common/host_card:available_spots_count', { count: availableSpots }) : t('common/host_card:no_spots')}
          </span>

          <div className="card-tags-group">
            {tags.map((tag, idx) => (
              <span key={idx} className={tag.startsWith('#') ? "card-vibe-pill" : "card-tag-pill"}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

