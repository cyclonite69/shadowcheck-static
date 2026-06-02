import { normalizeTooltipData } from '../../client/src/utils/geospatial/tooltipDataNormalizer';
import { renderNetworkTooltip } from '../../client/src/utils/geospatial/renderNetworkTooltip';

describe('normalizeTooltipData', () => {
  const mockTriggerElement = {
    getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0 }),
  };

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

  it('prioritizes WiGLE timestamps when wigle_source is present', () => {
    const normalized = normalizeTooltipData({
      bssid: 'AA:BB:CC:DD:EE:FF',
      wigle_source: 'wigle-v3',
      time: '2026-05-01T01:00:00Z',
      timestamp: '2026-05-01T02:00:00Z',
      observed_at: '2026-05-01T03:00:00Z',
      first_seen: '2026-04-01T00:00:00Z',
      firsttime: '2026-04-10T00:00:00Z',
      wigle_v3_first_seen: '2026-04-11T00:00:00Z',
      last_seen: '2026-05-02T00:00:00Z',
      lasttime: '2026-05-10T00:00:00Z',
      lastupdt: '2026-05-09T00:00:00Z',
    });

    expect(normalized.time).toBe('2026-05-10T00:00:00Z');
    expect(normalized.first_seen).toBe('2026-04-10T00:00:00Z');
    expect(normalized.last_seen).toBe('2026-05-10T00:00:00Z');
  });

  it('treats zero home distance values as missing', () => {
    expect(
      normalizeTooltipData({
        bssid: 'AA:BB:CC:DD:EE:FF',
        distance_from_home_km: 0,
      }).distance_from_home_km
    ).toBeNull();

    expect(
      normalizeTooltipData({
        bssid: 'AA:BB:CC:DD:EE:FF',
        distance_from_home_meters: 0,
      }).distance_from_home_km
    ).toBeNull();

    expect(
      normalizeTooltipData({
        bssid: 'AA:BB:CC:DD:EE:FF',
        distance_from_home: 0,
      }).distance_from_home_km
    ).toBeNull();
  });

  it('renders channel and frequency in a single Channel row', () => {
    const html = renderNetworkTooltip({
      ssid: 'Test',
      bssid: 'AA:BB:CC:DD:EE:FF',
      channel: 1,
      frequency: 2412,
      band: '2.4 GHz',
      triggerElement: mockTriggerElement,
    });

    expect(html).toContain('Channel');
    expect(html).toContain('1 (2.4 GHz) · 2412 MHz');
    expect(html).not.toContain('>Frequency<');
  });

  it('suppresses OBS numbering for WiGLE-origin tooltips', () => {
    const html = renderNetworkTooltip({
      ssid: 'WiGLE AP',
      bssid: 'AA:BB:CC:DD:EE:FF',
      wigle_source: 'wigle-v3',
      observation_count: 30,
      number: 75,
      time: '2026-05-01T12:00:00Z',
      last_seen: '2026-05-01T12:00:00Z',
      triggerElement: mockTriggerElement,
    });

    expect(html).not.toContain('OBS #75 of 30');
  });

  it('populates surveillance_type from canonical device_class for map Vendor Intel', () => {
    const normalized = normalizeTooltipData({
      bssid: 'AA:BB:CC:DD:EE:FF',
      device_class: 'L3HARRIS_STINGRAY',
    });

    expect(normalized.device_class).toBe('L3HARRIS_STINGRAY');
    expect(normalized.surveillance_type).toBe('L3HARRIS_STINGRAY');
  });

  it('renders Vendor Intel only for manifest-backed device classes', () => {
    const withIntel = renderNetworkTooltip({
      ssid: 'Intel',
      bssid: 'AA:BB:CC:DD:EE:FF',
      surveillance_type: 'L3HARRIS_STINGRAY',
      triggerElement: mockTriggerElement,
    });
    const withoutIntel = renderNetworkTooltip({
      ssid: 'Operational',
      bssid: 'AA:BB:CC:DD:EE:00',
      surveillance_type: 'FLOCK_SAFETY_CAMERA',
      triggerElement: mockTriggerElement,
    });

    expect(withIntel).toContain('data-vendor-intel="L3HARRIS_STINGRAY"');
    expect(withoutIntel).not.toContain('data-vendor-intel');
  });
});
