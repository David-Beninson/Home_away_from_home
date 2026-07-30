
import { useNavigate } from 'react-router-dom';
import useHostSearch from '../../hooks/useHostSearch';
import FindHostHeader from '../../components/FindHost/FindHostHeader';
import SearchFilterPanel from '../../components/FindHost/SearchFilterPanel';
import { useTranslation } from 'react-i18next';
import { HostCard } from '../../components/Common/HostCard';
import './FindHost.css';

export default function FindHost() {
  const { t } = useTranslation(['guest/find_host']);
  const navigate = useNavigate();
  const {
    hosts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    regionFilter,
    setRegionFilter,
    kashrutFilter,
    setKashrutFilter,
    lodgingFilter,
    handleLodgingToggle,
    availableOnlyFilter,
    handleAvailableOnlyToggle,
    sortBy,
    setSortBy,
    handleResetFilters,
    fetchHosts,
    toastMessage,
    hasActiveFilters
  } = useHostSearch();

  const handleSelectHost = (host) => {
    if (host?.id) {
      navigate(`/find-host/${host.id}`, { state: { host } });
    }
  };

  const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format';

  const topHosts = hosts || [];

  return (
    <div className="find-host-page">
      {/* 1. Header Hero Section */}
      <FindHostHeader />

      {/* 2. Control Panel: Search, Filters & Sorting */}
      <SearchFilterPanel
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        kashrutFilter={kashrutFilter}
        onKashrutChange={setKashrutFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        lodgingFilter={lodgingFilter}
        onLodgingToggle={handleLodgingToggle}
        availableOnlyFilter={availableOnlyFilter}
        onAvailableOnlyToggle={handleAvailableOnlyToggle}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        count={hosts.length}
      />

      {/* 3. Dynamic Hosts Grid, Loading & Empty States */}
      {loading && (!topHosts || topHosts.length === 0) ? (
        <div className="gh-hosts-loading">{t('guest/find_host:loading')}</div>
      ) : (
        <div className="gh-hosts-grid">
          {topHosts.map((host) => (
            <HostCard key={host.id} host={host} t={t} />
          ))}
        </div>
      )}

      {/* 5. Success Toast Feedback Banner */}
      {toastMessage && (
        <div className="toast-success-banner">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
