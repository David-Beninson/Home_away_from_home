/**
 * Shabbat & Jewish Calendar helper utility
 * Uses Hebcal API to retrieve candle lighting times and Parashat HaShavua for Israeli cities.
 */
import { geocodeCity } from './geocoding';

/**
 * Format current date in Hebrew locale:
 * e.g., "יום רביעי, 22 ביולי 2026"
 */
export function formatHebrewToday(date = new Date()) {
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

/**
 * Calculate the Date object for the upcoming Friday.
 */
function getUpcomingFriday(date = new Date()) {
  const target = new Date(date.getTime());
  const day = target.getDay(); // 0: Sun, 5: Fri, 6: Sat

  if (day === 6) {
    target.setDate(target.getDate() + 6);
  } else if (day !== 5) {
    target.setDate(target.getDate() + (5 - day));
  }
  return target;
}

/**
 * Format date as YYYY-MM-DD for Hebcal API
 */
function formatApiDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY_PREFIX = 'shabbat_info_cache_';

/**
 * Retrieve cached Shabbat info from localStorage if valid (under 6 hours & same calendar day).
 */
export function getCachedShabbatInfo(userCity = 'ירושלים') {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + userCity);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;

    const isExpired = Date.now() - parsed.timestamp > CACHE_TTL_MS;
    const currentTodayStr = formatHebrewToday();
    const isSameDay = parsed.data.todayFormatted === currentTodayStr;

    if (!isExpired && isSameDay) {
      return parsed.data;
    }
    // Return stale cache with isStale flag for fallback rendering
    return { ...parsed.data, isStale: true };
  } catch (e) {
    return null;
  }
}

/**
 * Fetches Shabbat candle lighting time and Parashat HaShavua for ANY city dynamically.
 * Caches results in localStorage with a 6-hour expiration and daily date sync.
 */
export async function getShabbatInfo(userCity = 'ירושלים') {
  const now = new Date();
  const todayFormatted = formatHebrewToday(now);
  const dayOfWeek = now.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;

  // Check valid cache first
  const cached = getCachedShabbatInfo(userCity);
  if (cached && !cached.isStale) {
    return cached;
  }

  // Resolve city coordinates dynamically via geocoding service
  const coords = await geocodeCity(userCity);

  // Target Friday for Shabbat calculation
  const targetFriday = getUpcomingFriday(now);
  const fridayDateFormatted = `${targetFriday.getDate()}.${targetFriday.getMonth() + 1}`;
  const dtParam = formatApiDate(targetFriday);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://www.hebcal.com/shabbat?cfg=json&geo=pos&lat=${coords.lat}&lon=${coords.lon}&tzid=Asia/Jerusalem&lg=he&dt=${dtParam}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Hebcal response status: ${response.status}`);
    }

    const data = await response.json();

    // Extract candle lighting and parasha events
    const candlesEvent = data.items?.find(item => item.category === 'candles');
    const parashaEvent = data.items?.find(item => item.category === 'parashat');

    let candleLighting = null;

    if (candlesEvent?.date) {
      const timeMatch = candlesEvent.date.match(/T(\d{2}:\d{2})/);
      if (timeMatch) {
        candleLighting = timeMatch[1];
      }
    }

    if (!candleLighting && candlesEvent?.title) {
      const match = candlesEvent.title.match(/\d{1,2}:\d{2}/);
      if (match) candleLighting = match[0];
    }

    let parasha = parashaEvent?.hebrew || parashaEvent?.title || 'שבת';
    parasha = parasha.replace(/^פרשת\s+/, '');

    const result = {
      success: true,
      todayFormatted,
      dayOfWeek,
      isFriday,
      isSaturday,
      parasha,
      candleLighting,
      fridayDateFormatted,
      cityName: coords.displayName || userCity
    };

    // Save to localStorage with 6-hour timestamp
    try {
      localStorage.setItem(
        CACHE_KEY_PREFIX + userCity,
        JSON.stringify({ data: result, timestamp: Date.now() })
      );
    } catch (e) {
      console.warn('Failed to save Shabbat info to localStorage:', e);
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch Shabbat times from Hebcal:', error);
    if (cached) {
      return { ...cached, todayFormatted };
    }

    return {
      success: false,
      todayFormatted,
      dayOfWeek,
      isFriday,
      isSaturday,
      parasha: null,
      candleLighting: null,
      fridayDateFormatted,
      cityName: coords.displayName || userCity
    };
  }
}

/**
 * Format upcoming Friday date as a localized Hebrew string.
 * @param {string|Date} [dateInput] - Optional date to format, defaults to calculating upcoming Friday.
 * @returns {string} Formatted Friday date string
 */
export function getUpcomingFridayDateStr(dateInput) {
  let d;
  if (dateInput) {
    try {
      if (typeof dateInput === 'string' && dateInput.includes('-')) {
        const parts = dateInput.split('T')[0].split('-').map(Number);
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(dateInput);
      }
    } catch (e) {
      console.warn('Invalid date format:', e);
      d = getUpcomingFriday();
    }
  } else {
    d = getUpcomingFriday();
  }

  try {
    return d.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    console.warn('Error formatting date:', e);
    return '';
  }
}

/**
 * Format host open date range or list (e.g. "חמישי - שבת, 23–25 ביולי 2026")
 */
export function formatHostOpenDates(host) {
  if (!host) return '';

  const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const HEBREW_MONTHS = [
    'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
    'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'
  ];

  const formatPart = (d) => `יום ${HEBREW_DAYS[d.getDay()]}, ${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]}`;

  const openDates = host.upcoming_open_dates || host.open_dates;
  if (Array.isArray(openDates) && openDates.length > 1) {
    const dates = openDates
      .map(dStr => {
        if (typeof dStr === 'string' && dStr.includes('-')) {
          const parts = dStr.split('T')[0].split('-').map(Number);
          return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(dStr);
      })
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a - b);

    if (dates.length > 1) {
      const first = dates[0];
      const last = dates[dates.length - 1];
      return `${formatPart(first)} -> ${formatPart(last)} ${last.getFullYear()}`;
    }
  }

  if (host.start_date && host.end_date) {
    const d1 = new Date(host.start_date);
    const d2 = new Date(host.end_date);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      return `${formatPart(d1)} - ${formatPart(d2)} ${d2.getFullYear()}`;
    }
  }

  const singleDate = host.date || host.shabbat_date || host.requested_date || (openDates && openDates[0]);
  if (singleDate) {
    let d;
    if (typeof singleDate === 'string' && singleDate.includes('-')) {
      const parts = singleDate.split('T')[0].split('-').map(Number);
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(singleDate);
    }
    if (!isNaN(d.getTime())) {
      return `${formatPart(d)} ${d.getFullYear()}`;
    }
  }

  return 'סוף השבוע הקרוב';
}
