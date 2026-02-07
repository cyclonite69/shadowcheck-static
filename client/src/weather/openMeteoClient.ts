import { logWarn } from '../logging/clientLogger';
import type { WeatherData } from './weatherFxPolicy';

const cache = new Map<string, WeatherData>();
let lastFetchMs = 0;
const CACHE_BUCKET_MS = 300000; // 5 minutes
const RATE_LIMIT_MS = 60000; // 60 seconds

export async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
  // Rate limiting
  const now = Date.now();
  if (now - lastFetchMs < RATE_LIMIT_MS) {
    return null;
  }

  // Cache key: 2-decimal grid + 5-min bucket
  const gridKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const bucketKey = Math.floor(now / CACHE_BUCKET_MS);
  const cacheKey = `${gridKey}:${bucketKey}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    lastFetchMs = now;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set(
      'current',
      'precipitation,snowfall,cloud_cover,visibility,weather_code,is_day'
    );
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.current) throw new Error('No current data in response');

    const weather: WeatherData = {
      precip_mm: data.current.precipitation ?? 0,
      snowfall_cm: (data.current.snowfall ?? 0) / 10, // convert mm to cm
      cloudcover_pct: data.current.cloud_cover ?? 0,
      visibility_m: data.current.visibility ?? 10000,
      weathercode: data.current.weather_code ?? 0,
      is_day: (data.current.is_day ?? 1) === 1,
    };

    cache.set(cacheKey, weather);
    return weather;
  } catch (error) {
    logWarn(
      '[Weather FX] Failed to fetch weather:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}
