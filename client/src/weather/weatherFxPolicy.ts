export interface WeatherData {
  precip_mm: number;
  snowfall_cm: number;
  cloudcover_pct: number;
  visibility_m: number;
  weathercode: number;
  is_day: boolean;
}

export type FxMode = 'none' | 'cloudy' | 'foggy' | 'rain' | 'snow';

export interface WeatherClassification {
  mode: FxMode;
  intensity: number; // 0.0–1.0
}

export function classifyFx(weather: WeatherData): WeatherClassification {
  // Priority: snow > rain > foggy > cloudy > none

  // Snow: snowfall_cm > 0 OR weathercode in {71,73,75,77,85,86}
  if (weather.snowfall_cm > 0 || [71, 73, 75, 77, 85, 86].includes(weather.weathercode)) {
    const snowIntensity = Math.min(weather.snowfall_cm / 5, 1.0);
    return { mode: 'snow', intensity: Math.max(snowIntensity, 0.3) };
  }

  // Rain: precip_mm > 0 AND not snow
  if (weather.precip_mm > 0) {
    const rainIntensity = Math.min(weather.precip_mm / 10, 1.0);
    return { mode: 'rain', intensity: Math.max(rainIntensity, 0.3) };
  }

  // Foggy: visibility_m < 2000 OR weathercode in {45,48}
  if (weather.visibility_m < 2000 || [45, 48].includes(weather.weathercode)) {
    const visibilityFactor = Math.max(0, (2000 - weather.visibility_m) / 2000);
    return { mode: 'foggy', intensity: Math.max(visibilityFactor, 0.4) };
  }

  // Cloudy: cloudcover_pct > 70
  if (weather.cloudcover_pct > 70) {
    const cloudIntensity = (weather.cloudcover_pct - 70) / 30;
    return { mode: 'cloudy', intensity: Math.min(cloudIntensity, 1.0) };
  }

  // Clear
  return { mode: 'none', intensity: 0 };
}
