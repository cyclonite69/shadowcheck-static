import { classifyFx, WeatherData } from '../weatherFxPolicy';

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    precip_mm: 0,
    snowfall_cm: 0,
    cloudcover_pct: 0,
    visibility_m: 10000,
    weathercode: 0,
    is_day: true,
    ...overrides,
  };
}

describe('classifyFx', () => {
  test('heavy snow by snowfall rate', () => {
    const result = classifyFx(makeWeather({ snowfall_cm: 5 }));
    expect(result.mode).toBe('snow');
    expect(result.intensity).toBeLessThanOrEqual(1.0);
  });

  test('snow by weathercode', () => {
    const result = classifyFx(makeWeather({ weathercode: 73 }));
    expect(result.mode).toBe('snow');
  });

  test('light rain', () => {
    const result = classifyFx(makeWeather({ precip_mm: 2 }));
    expect(result.mode).toBe('rain');
    expect(result.intensity).toBeGreaterThanOrEqual(0.3);
  });

  test('heavy rain', () => {
    const result = classifyFx(makeWeather({ precip_mm: 15 }));
    expect(result.mode).toBe('rain');
    expect(result.intensity).toBeLessThanOrEqual(1.0);
  });

  test('fog by low visibility', () => {
    const result = classifyFx(makeWeather({ visibility_m: 500 }));
    expect(result.mode).toBe('foggy');
    expect(result.intensity).toBeGreaterThan(0.4);
  });

  test('fog by weathercode', () => {
    const result = classifyFx(makeWeather({ weathercode: 45 }));
    expect(result.mode).toBe('foggy');
  });

  test('cloudy sky', () => {
    const result = classifyFx(makeWeather({ cloudcover_pct: 85 }));
    expect(result.mode).toBe('cloudy');
  });

  test('clear sky', () => {
    const result = classifyFx(makeWeather());
    expect(result.mode).toBe('none');
    expect(result.intensity).toBe(0);
  });

  test('snow priority over rain', () => {
    const result = classifyFx(makeWeather({ snowfall_cm: 1, precip_mm: 5 }));
    expect(result.mode).toBe('snow');
  });

  test('rain priority over fog', () => {
    const result = classifyFx(makeWeather({ precip_mm: 5, visibility_m: 500 }));
    expect(result.mode).toBe('rain');
  });

  test('intensity capped at 1.0', () => {
    const result = classifyFx(makeWeather({ snowfall_cm: 100 }));
    expect(result.intensity).toBeLessThanOrEqual(1.0);
  });

  test('intensity is 0 for clear mode', () => {
    const result = classifyFx(makeWeather());
    expect(result.intensity).toBe(0);
  });
});
