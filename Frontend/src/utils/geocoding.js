/**
 * Geocoding & Location utility service
 * Provides dynamic geocoding for Israeli cities/towns using OpenStreetMap Nominatim
 * with memory and localStorage caching.
 */

// In-memory cache for geocoded city coordinates
const geoCache = new Map();

const DEFAULT_COORDS = { lat: 31.7683, lon: 35.2137, displayName: 'ירושלים' };

/**
 * Dynamically geocodes any city/town name in Israel using OpenStreetMap Nominatim API.
 * Caches results in localStorage and memory to avoid duplicate requests.
 */
export async function geocodeCity(cityName) {
  if (!cityName || typeof cityName !== 'string') {
    return DEFAULT_COORDS;
  }

  const cleanName = cityName.trim();
  if (!cleanName || cleanName === 'לא צוין') {
    return DEFAULT_COORDS;
  }

  // 1. Check in-memory cache
  if (geoCache.has(cleanName)) {
    return geoCache.get(cleanName);
  }

  // 2. Check localStorage cache
  const cacheKey = `geo_cache_${cleanName}`;
  try {
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      geoCache.set(cleanName, parsed);
      return parsed;
    }
  } catch {
    // Ignore localStorage errors
  }

  // 3. Dynamic lookup via OpenStreetMap Nominatim API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const query = encodeURIComponent(`${cleanName}, ישראל`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&accept-language=he&limit=1`,
      {
        headers: { 'User-Agent': 'HomeAwayFromHomeApp/1.0' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: cleanName
        };

        geoCache.set(cleanName, result);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // Ignore localStorage write quota errors
        }

        return result;
      }
    }
  } catch (err) {
    console.warn(`Dynamic geocoding for "${cleanName}" failed, falling back to Jerusalem:`, err);
  }

  // Fallback to Jerusalem
  return { ...DEFAULT_COORDS, displayName: cleanName };
}
