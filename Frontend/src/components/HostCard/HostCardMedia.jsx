import { useState } from 'react';
import { Utensils, Zap, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format';

export default function HostCardMedia({ host }) {
  const { t } = useTranslation(['common/host_card']);
  const [imageError, setImageError] = useState(false);

  const imageUrl = !imageError && host?.image_url ? host.image_url : DEFAULT_IMAGE;
  const hostName = host?.full_name || host?.host_name || t('common/host_card:default_name');
  const hasLodging = host?.has_lodging !== undefined ? host.has_lodging : true;

  // Kashrut label formatter
  const getKashrutLabel = (level) => {
    if (!level) return t('common/host_card:kashrut.mehadrin');
    const norm = String(level).toLowerCase();
    if (norm === 'glatt_mehadrin' || norm === 'mehadrin') return t('common/host_card:kashrut.mehadrin');
    if (norm === 'kosher' || norm === 'כשר') return t('common/host_card:kashrut.kosher');
    if (norm === 'basic') return t('common/host_card:kashrut.basic');
    if (norm === 'none') return t('common/host_card:kashrut.none');
    return level;
  };

  const kashrutText = getKashrutLabel(host?.kashrut_level);
  const matchPercentage = host?.match_percentage ?? host?.match_score ?? 96;

  const getMatchBgClass = (score) => {
    if (score >= 90) return 'bg-emerald-500 match-emerald';
    if (score >= 75) return 'bg-blue-500 match-blue';
    return 'bg-amber-500 match-amber';
  };

  const matchBgClass = getMatchBgClass(matchPercentage);

  return (
    <div className="card-media-wrapper">
      <img
        src={imageUrl}
        alt={hostName}
        onError={() => setImageError(true)}
        className="card-media-img"
        loading="lazy"
      />
      <div className="card-media-gradient" />

      {/* Top Right Badges */}
      <div className="card-badges-right">
        {kashrutText && (
          <span className="card-badge-kashrut">
            <Utensils size={12} className="badge-icon-xs" />
            {kashrutText}
          </span>
        )}

        {matchPercentage !== null && matchPercentage !== undefined && (
          <span className={`card-badge-match ${matchBgClass}`}>
            <Zap size={12} className="badge-icon-xs" />
            {matchPercentage}%
          </span>
        )}
      </div>

      {/* Top Left Badge */}
      {hasLodging && (
        <div className="card-badge-lodging">
          <Moon size={12} className="badge-icon-xs" />
          {t('common/host_card:lodging')}
        </div>
      )}
    </div>
  );
}

