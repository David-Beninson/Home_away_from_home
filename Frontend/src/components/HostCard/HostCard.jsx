
import { Star, MapPin } from 'lucide-react';
import HostCardMedia from './HostCardMedia';
import './HostCard.css';

export default function HostCard({ host, onBookingRequest }) {
  if (!host) return null;

  const fullName = host.full_name || host.host_name ;
  const rating = host.rating !== undefined && host.rating !== null ? Number(host.rating).toFixed(1) : '4.9';
  const reviewsCount = host.reviews_count ?? host.review_count ?? 47;
  const city = host.city || 'לא צוין';
  const hasOpenDays = host.upcoming_open_days && host.upcoming_open_days.length > 0;
  const availableSpots = hasOpenDays
    ? (host.available_spots !== undefined && host.available_spots !== null ? host.available_spots : 2)
    : 0;
  const tags = host.tags && host.tags.length > 0 ? host.tags : ['ילדים', 'חם ומשפחתי'];

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
            📅 זמין השבוע ב: {host.upcoming_open_days.join(', ')}
          </div>
        ) : (
          <div className="upcoming-no-spots">
            אין עוד מקומות פנויים אצל מארח זה
          </div>
        )}

        {/* Row 3: Available Spots (Right) & Tags (Left) */}
        <div className="card-row-footer">
          <span className={`card-spots-text ${availableSpots > 0 ? 'text-amber' : 'text-red'}`}>
            {availableSpots > 0 ? `${availableSpots} מקומות` : 'אזלו המקומות'}
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

