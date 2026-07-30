import { BRAND_TITLE, BRAND_SUBTITLE } from '../../config/brand';
import { useTranslation } from 'react-i18next';

export default function HomeGuestHero({ shabbatInfo, availableHostsCount }) {
  const { t } = useTranslation(['guest/home']);
  const { todayFormatted, candleLighting, cityName } = shabbatInfo || {};

  return (
    <section className="gh-hero">
      <div className="gh-hero-content">
        <span className="gh-hero-subtitle">{t('guest/home:hero.subtitle')}</span>
        <h1 className="gh-hero-title">{todayFormatted || BRAND_TITLE}</h1>
        <p className="gh-hero-info">
          {candleLighting ? t('guest/home:hero.candle_lighting', { city: cityName || t('guest/home:hero.default_city'), time: candleLighting }) : BRAND_TITLE}
          {availableHostsCount > 0 && ` · ${availableHostsCount} ${t('guest/home:hero.waiting_families')}`}
        </p>
      </div>
    </section>
  );
}
