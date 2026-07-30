
import { useTranslation } from 'react-i18next';

export default function EmptyResultsState({ onResetFilters }) {
  const { t } = useTranslation(['guest/find_host']);
  return (
    <div className="empty-results-state">
      <h3>{t('guest/find_host:empty.title')}</h3>
      <p>{t('guest/find_host:empty.subtitle')}</p>
      {onResetFilters && (
        <button className="reset-search-btn" onClick={onResetFilters}>
          {t('guest/find_host:empty.reset_btn')}
        </button>
      )}
    </div>
  );
}
