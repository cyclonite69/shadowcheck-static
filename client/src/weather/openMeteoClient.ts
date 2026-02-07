import { logWarn } from '../logging/clientLogger';
import type { WeatherData } from './weatherFxPolicy';

const cache = new Map<string, WeatherData>();
let lastFetchMs = 0;
const CACHE_BUCKET_MS = 300000; // 5 minutes
const RATE_LIMIT_MS = 60000; // 60 seconds

export async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const now = Date.now();
  if (now - lastFetchMs < RATE_LIMIT_MS) {
    return null;
  }

  const gridKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const bucketKey = Math.floor(now / CACHE_BUCKET_MS);
  const cacheKey = `${gridKey}:${bucketKey}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    lastFetchMs = now;
    const url = new URL('/api/weather', window.location.origin);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.current) throw new Error('No current data in response');

    const weather: WeatherData = {
      precip_mm: data.current.precipitation ?? 0,
      snowfall_cm: (data.current.snowfall ?? 0) / 10,
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
