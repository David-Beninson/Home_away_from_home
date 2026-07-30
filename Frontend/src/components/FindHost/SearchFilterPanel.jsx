
import { Search, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SearchFilterPanel({
  searchTerm = '',
  onSearchChange,
  regionFilter = 'ALL',
  onRegionChange,
  kashrutFilter = 'ALL',
  onKashrutChange,
  sortBy = 'AI',
  onSortChange,
  lodgingFilter = 'ALL',
  onLodgingToggle,
  count = 0,
}) {
  const { t } = useTranslation(['guest/find_host']);

  const regions = [
    { id: 'ALL', label: t('guest/find_host:filters.regions.all') },
    { id: 'מרכז', label: t('guest/find_host:filters.regions.center') },
    { id: 'ירושלים', label: t('guest/find_host:filters.regions.jerusalem') },
    { id: 'צפון', label: t('guest/find_host:filters.regions.north') },
    { id: 'דרום', label: t('guest/find_host:filters.regions.south') },
  ];

  const kashrutOptions = [
    { id: 'ALL', label: t('guest/find_host:filters.kashrut.all') },
    { id: 'kosher', label: t('guest/find_host:filters.kashrut.kosher') },
    { id: 'mehadrin', label: t('guest/find_host:filters.kashrut.mehadrin') },
  ];

  const sortOptions = [
    { id: 'AI', label: t('guest/find_host:filters.sort.ai') },
    { id: 'RATING', label: t('guest/find_host:filters.sort.rating') },
    { id: 'SPOTS', label: t('guest/find_host:filters.sort.spots') },
    { id: 'NAME', label: t('guest/find_host:filters.sort.name') },
  ];

  return (
    <div className="search-filter-card">
      {/* Search Input Box */}
      <div className="search-input-relative-wrap">
        <Search size={20} className="search-input-icon-svg" />
        <input
          type="text"
          placeholder={t('guest/find_host:filters.search_placeholder')}
          dir="auto"
          className="search-input-element"
          value={searchTerm}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Row: Region, Kashrut, Lodging */}
      <div className="search-filter-row">
        {/* Region Filter */}
        <div className="filter-item-group">
          <span className="filter-group-label">{t('guest/find_host:filters.labels.region')}</span>
          <div className="filter-pills-container">
            {regions.map((reg) => {
              const isActive = regionFilter === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  className={`pill-btn ${isActive ? 'active-pill' : ''}`}
                  onClick={() => onRegionChange && onRegionChange(reg.id)}
                >
                  {reg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kashrut Filter */}
        <div className="filter-item-group">
          <span className="filter-group-label">{t('guest/find_host:filters.labels.kashrut')}</span>
          <div className="filter-pills-container">
            {kashrutOptions.map((k) => {
              const isActive =
                (k.id === 'ALL' && (kashrutFilter === 'ALL' || !kashrutFilter)) ||
                (k.id === 'kosher' && (kashrutFilter === 'kosher' || kashrutFilter === 'KOSHER' || kashrutFilter === 'basic')) ||
                (k.id === 'mehadrin' && (kashrutFilter === 'mehadrin' || kashrutFilter === 'MEHADRIN' || kashrutFilter === 'glatt_mehadrin'));
              return (
                <button
                  key={k.id}
                  type="button"
                  className={`pill-btn ${isActive ? 'active-pill' : ''}`}
                  onClick={() => onKashrutChange && onKashrutChange(k.id)}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lodging Toggle */}
        <div className="filter-item-group">
          <button
            type="button"
            className={`pill-btn lodging-pill-btn ${lodgingFilter === 'LODGING_ONLY' ? 'active-pill' : ''}`}
            onClick={onLodgingToggle}
          >
            <Moon size={14} className="moon-icon" />
            {t('guest/find_host:filters.labels.lodging')}
          </button>
        </div>
      </div>

      {/* Vibe Filter Row */}
      <div className="filter-item-group vibe-filter-group">
        <span className="filter-group-label">{t('guest/find_host:filters.labels.vibe')}</span>
        <div className="filter-pills-container scrollbar-none vibe-pills-nowrap">
          {t('guest/find_host:filters.vibes', { returnObjects: true }).map((vibeTag) => {
            const isActive = searchTerm === vibeTag || searchTerm.includes(vibeTag);
            return (
              <button
                key={vibeTag}
                type="button"
                className={`pill-btn vibe-pill-btn ${isActive ? 'active-pill' : ''}`}
                onClick={() => onSearchChange && onSearchChange(isActive ? '' : vibeTag)}
              >
                {vibeTag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sorting & Results Count Footer */}
      <div className="search-card-footer-row">
        <div className="sort-controls-group">
          <span className="sort-group-label">{t('guest/find_host:filters.labels.sort')}</span>
          <div className="sort-chips-container">
            {sortOptions.map((opt) => {
              const isActive = sortBy === opt.id || (opt.id === 'AI' && sortBy === 'DESC');
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`sort-chip-btn ${isActive ? 'active-chip' : ''}`}
                  onClick={() => onSortChange && onSortChange(opt.id)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="results-count-text">
          <span className="results-count-number">{count}</span> {t('guest/find_host:filters.results_count')}
        </p>
      </div>
    </div>
  );
}
