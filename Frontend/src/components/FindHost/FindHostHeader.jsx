import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getShabbatInfo, getCachedShabbatInfo, formatHebrewToday } from "../../utils/shabbat";
import { useTranslation } from 'react-i18next';

export default function FindHostHeader() {
  const { t } = useTranslation(['guest/find_host']);
  const user = useSelector((state) => state.auth.user);
  
  // Determine city based on logged-in user profile
  const profile = user?.profile;
  const userCity = profile?.city || profile?.origin_city || t('guest/find_host:header.default_city');

  const [shabbatData, setShabbatData] = useState(() => getCachedShabbatInfo(userCity));
  const [loading, setLoading] = useState(() => !getCachedShabbatInfo(userCity));

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // Check cache first for user city
      const cached = getCachedShabbatInfo(userCity);
      if (cached && isMounted) {
        setShabbatData(cached);
        setLoading(false);
      }

      // Fetch Shabbat info (handles 6-hour cache check internally)
      const info = await getShabbatInfo(userCity);
      
      if (isMounted) {
        setShabbatData(info);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userCity]);

  // Early return for loading state (Cleaner than a render function)
  if (loading) {
    return (
      <header className="find-host-header">
        <h1>{t('guest/find_host:header.title')}</h1>
        <p className="shabbat-info-text loading" aria-busy="true">
          <span className="shabbat-skeleton-bar" />
        </p>
      </header>
    );
  }

  // Fallback if data or lighting times are missing
  const hasValidData = shabbatData?.success && shabbatData?.candleLighting;
  const todayText = shabbatData?.todayFormatted || formatHebrewToday();

  return (
    <header className="find-host-header">
      <h1>{t('guest/find_host:header.title')}</h1>
      {!hasValidData ? (
        <p className="shabbat-info-text single-line">{todayText}</p>
      ) : shabbatData.isFriday ? (
        <p className="shabbat-info-text single-line">
          {t('guest/find_host:header.friday_format', { today: shabbatData.todayFormatted, parasha: shabbatData.parasha, candle_lighting: shabbatData.candleLighting, city: shabbatData.cityName })}
        </p>
      ) : shabbatData.isSaturday ? (
        <p className="shabbat-info-text single-line">
          {t('guest/find_host:header.saturday_format', { today: shabbatData.todayFormatted, parasha: shabbatData.parasha, friday_date: shabbatData.fridayDateFormatted, candle_lighting: shabbatData.candleLighting, city: shabbatData.cityName })}
        </p>
      ) : (
        /* Sunday through Thursday: Clean 2-line declarative layout */
        <p className="shabbat-info-text two-lines">
          <span className="shabbat-date-line">{shabbatData.todayFormatted}</span>
          <span className="shabbat-details-line">
            {t('guest/find_host:header.weekday_format', { parasha: shabbatData.parasha, friday_date: shabbatData.fridayDateFormatted, candle_lighting: shabbatData.candleLighting, city: shabbatData.cityName })}
          </span>
        </p>
      )}
    </header>
  );
}
