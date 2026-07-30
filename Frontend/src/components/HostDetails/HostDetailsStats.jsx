import { Users, Utensils, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HostDetailsStats({ spotsFormatted, kashrutText, hasLodging }) {
  const { t } = useTranslation(['guest/host_details']);
  return (
    <div className="host-stats-grid">
      {/* Spots Card */}
      <div className="stat-card">
        <div className="stat-icon-wrapper text-emerald">
          <Users className="stat-icon" />
        </div>
        <p className="stat-value text-emerald">{spotsFormatted}</p>
        <p className="stat-label">{t('guest/host_details:stats.spots_label')}</p>
      </div>

      {/* Kashrut Card */}
      <div className="stat-card">
        <div className="stat-icon-wrapper text-purple">
          <Utensils className="stat-icon" />
        </div>
        <p className="stat-value text-purple">{kashrutText}</p>
        <p className="stat-label">{t('guest/host_details:stats.kashrut_label')}</p>
      </div>

      {/* Lodging Card */}
      <div className="stat-card">
        <div className="stat-icon-wrapper text-primary">
          <Moon className="stat-icon" />
        </div>
        <p className="stat-value text-primary">
          {hasLodging ? t('guest/host_details:stats.lodging_yes') : t('guest/host_details:stats.lodging_no')}
        </p>
        <p className="stat-label">{t('guest/host_details:stats.lodging_label')}</p>
      </div>
    </div>
  );
}
