

export default function HomeGuestHero({ shabbatInfo, availableHostsCount }) {
  const { todayFormatted, candleLighting, cityName } = shabbatInfo || {};

  return (
    <section className="gh-hero">
      <div className="gh-hero-content">
        <span className="gh-hero-subtitle">שבת הקרובה</span>
        <h1 className="gh-hero-title">{todayFormatted || 'שבת שלום'}</h1>
        <p className="gh-hero-info">
          {candleLighting ? `כניסת שבת (${cityName || 'ירושלים'}) בשעה ${candleLighting}` : 'שבת שלום'}
          {availableHostsCount > 0 && ` · ${availableHostsCount} משפחות מחכות לכם`}
        </p>
      </div>
    </section>
  );
}
