import { normalizeTooltipData } from '../../client/src/utils/geospatial/tooltipDataNormalizer';

describe('normalizeTooltipData', () => {
  it('normalizes mixed aliases into canonical tooltip fields', () => {
    const normalized = normalizeTooltipData({
      netid: 'AA:BB:CC:DD:EE:FF',
      name: 'My AP',
      bestlevel: -47,
      capabilities: '[WPA2-PSK-CCMP][ESS]',
      trilat: 43.1,
      trilong: -83.7,
      obs_count: 12,
      timestamp: '2026-02-01T10:00:00Z',
      firsttime: '2026-01-31T09:00:00Z',
      lastupdt: '2026-02-01T11:00:00Z',
      distance_from_home: 1.2,
      acc: 4,
    });

    expect(normalized.bssid).toBe('AA:BB:CC:DD:EE:FF');
    expect(normalized.ssid).toBe('My AP');
    expect(normalized.signal).toBe(-47);
    expect(normalized.security).toBe('WPA2-P');
    expect(normalized.lat).toBe(43.1);
    expect(normalized.lon).toBe(-83.7);
    expect(normalized.observation_count).toBe(12);
    expect(normalized.time).toBe('2026-02-01T10:00:00Z');
    expect(normalized.first_seen).toBe('2026-01-31T09:00:00Z');
    expect(normalized.last_seen).toBe('2026-02-01T11:00:00Z');
    expect(normalized.distance_from_home_km).toBe(1.2);
    expect(normalized.accuracy).toBe(4);
  });

  it('uses fallback map position when row does not include coordinates', () => {
    const normalized = normalizeTooltipData({ bssid: 'AA:AA:AA:AA:AA:AA' }, [-83.75, 43.02]);

    expect(normalized.lon).toBe(-83.75);
    expect(normalized.lat).toBe(43.02);
  });

  it('converts large ambiguous distance_from_home values from meters to kilometers', () => {
    const normalized = normalizeTooltipData({
      bssid: 'C4:49:BB:2A:B4:84',
      frequency: '2412 MHz',
      channel: '1',
      distance_from_home: 10953.51892936,
      max_distance_meters: 10739.7370788,
    });

    expect(normalized.frequency).toBe(2412);
    expect(normalized.channel).toBe(1);
    expect(normalized.distance_from_home_km).toBeCloseTo(10.9535, 4);
    expect(normalized.max_distance_km).toBeCloseTo(10.7397, 4);
  });
});
