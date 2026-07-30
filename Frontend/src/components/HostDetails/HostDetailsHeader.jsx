import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HostDetailsHeader({ hostName, onBack }) {
  const { t } = useTranslation(['guest/host_details']);
  return (
    <div className="host-details-breadcrumb">
      <button
        type="button"
        onClick={onBack}
        className="breadcrumb-back-btn"
      >
        {t('guest/host_details:header.back_btn')}
      </button>
      <ChevronRight className="breadcrumb-arrow" />
      <span className="breadcrumb-current">{hostName}</span>
    </div>
  );
}
