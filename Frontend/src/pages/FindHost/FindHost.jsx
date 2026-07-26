
import { useNavigate } from 'react-router-dom';
import useHostSearch from '../../hooks/useHostSearch';
import FindHostHeader from '../../components/FindHost/FindHostHeader';
import SearchFilterPanel from '../../components/FindHost/SearchFilterPanel';
import { Sparkles, Star, MapPin } from 'lucide-react';
import './FindHost.css';

export default function FindHost() {
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
        <div className="gh-hosts-loading">טוען מארחים...</div>
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

      {/* 5. Success Toast Feedback Banner */}
      {toastMessage && (
        <div className="toast-success-banner">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
