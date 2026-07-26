

import { BRAND_TITLE, BRAND_SUBTITLE } from '../../config/brand';

export default function HomeGuestHero({ shabbatInfo, availableHostsCount }) {
  const { todayFormatted, candleLighting, cityName } = shabbatInfo || {};

  return (
    <section className="gh-hero">
      <div className="gh-hero-content">
        <span className="gh-hero-subtitle">שבת הקרובה</span>
        <h1 className="gh-hero-title">{todayFormatted || BRAND_TITLE}</h1>
        <p className="gh-hero-info">
          {candleLighting ? `כניסת שבת (${cityName || 'ירושלים'}) בשעה ${candleLighting}` : BRAND_TITLE}
          {availableHostsCount > 0 && ` · ${availableHostsCount} משפחות מחכות לכם`}
        </p>
      </div>
    </section>
  );
}
