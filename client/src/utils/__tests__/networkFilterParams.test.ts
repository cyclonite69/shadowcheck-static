import {
  toFiniteNumber,
  parseRelativeTimeframeToMs,
  appendNetworkFilterParams,
} from '../networkFilterParams';

describe('toFiniteNumber', () => {
  it('passes through finite numbers unchanged', () => {
    expect(toFiniteNumber(42)).toBe(42);
    expect(toFiniteNumber(-3.14)).toBe(-3.14);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(toFiniteNumber('100')).toBe(100);
    expect(toFiniteNumber('-50.5')).toBe(-50.5);
  });

  it('returns null for non-finite values', () => {
    expect(toFiniteNumber(Infinity)).toBeNull();
    expect(toFiniteNumber(-Infinity)).toBeNull();
    expect(toFiniteNumber(NaN)).toBeNull();
  });

  it('returns null for null and undefined', () => {
    expect(toFiniteNumber(null)).toBeNull();
    expect(toFiniteNumber(undefined)).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(toFiniteNumber('abc')).toBeNull();
    expect(toFiniteNumber('')).toBeNull();
  });
});

describe('parseRelativeTimeframeToMs', () => {
  it('converts hours correctly', () => {
    expect(parseRelativeTimeframeToMs('1h')).toBe(3600000);
    expect(parseRelativeTimeframeToMs('12h')).toBe(12 * 3600000);
  });

  it('converts days correctly', () => {
    expect(parseRelativeTimeframeToMs('1d')).toBe(86400000);
    expect(parseRelativeTimeframeToMs('30d')).toBe(30 * 86400000);
  });

  it('converts months approximately (30.44 days)', () => {
    const ms = parseRelativeTimeframeToMs('2mo');
    expect(ms).not.toBeNull();
    // 2 * 30.44 * 86400000
    expect(ms).toBeCloseTo(2 * 30.44 * 86400000, -3);
  });

  it('converts years correctly', () => {
    expect(parseRelativeTimeframeToMs('1y')).toBe(365 * 86400000);
  });

  it('returns null for malformed strings', () => {
    expect(parseRelativeTimeframeToMs('xd')).toBeNull();
    expect(parseRelativeTimeframeToMs('')).toBeNull();
  });
});

describe('appendNetworkFilterParams', () => {
  const makeParams = () => new URLSearchParams();

  it('does not append ssid when disabled', () => {
    const params = makeParams();
    appendNetworkFilterParams(params, { ssid: 'TestNet' }, { ssid: false });
    expect(params.has('ssid')).toBe(false);
  });

  it('appends ssid when enabled', () => {
    const params = makeParams();
    appendNetworkFilterParams(params, { ssid: 'TestNet' }, { ssid: true });
    expect(params.get('ssid')).toBe('TestNet');
  });

  it('does not append bssid when disabled', () => {
    const params = makeParams();
    appendNetworkFilterParams(params, { bssid: 'AA:BB:CC:DD:EE:FF' }, { bssid: false });
    expect(params.has('bssid')).toBe(false);
  });

  it('appends bssid when enabled', () => {
    const params = makeParams();
    appendNetworkFilterParams(params, { bssid: 'AA:BB:CC:DD:EE:FF' }, { bssid: true });
    expect(params.get('bssid')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('joins encryptionTypes with comma', () => {
    const params = makeParams();
    appendNetworkFilterParams(
      params,
      { encryptionTypes: ['WPA2', 'WPA3'] },
      { encryptionTypes: true }
    );
    expect(params.get('encryptionTypes')).toBe('WPA2,WPA3');
  });

  it('converts distance from metres to km', () => {
    const params = makeParams();
    appendNetworkFilterParams(params, { distanceFromHomeMax: 5000 }, { distanceFromHomeMax: true });
    expect(params.get('distance_from_home_km_max')).toBe('5');
  });

  it('appends valid bounding box params', () => {
    const params = makeParams();
    appendNetworkFilterParams(
      params,
      { boundingBox: { north: 51, south: 50, east: 1, west: -1 } },
      { boundingBox: true }
    );
    expect(params.get('bbox_min_lat')).toBe('50');
    expect(params.get('bbox_max_lat')).toBe('51');
    expect(params.get('bbox_min_lng')).toBe('-1');
    expect(params.get('bbox_max_lng')).toBe('1');
  });

  it('does not append invalid bounding box (minLat > maxLat)', () => {
    const params = makeParams();
    appendNetworkFilterParams(
      params,
      { boundingBox: { north: 49, south: 51, east: 1, west: -1 } },
      { boundingBox: true }
    );
    expect(params.has('bbox_min_lat')).toBe(false);
  });

  it('appends valid radius filter params', () => {
    const params = makeParams();
    appendNetworkFilterParams(
      params,
      { radiusFilter: { latitude: 40.7, longitude: -74.0, radiusMeters: 500 } },
      { radiusFilter: true }
    );
    expect(params.get('radius_center_lat')).toBe('40.7');
    expect(params.get('radius_center_lng')).toBe('-74');
    expect(params.get('radius_meters')).toBe('500');
  });

  it('does not append radius filter when radius is 0 or negative', () => {
    const params = makeParams();
    appendNetworkFilterParams(
      params,
      { radiusFilter: { latitude: 40.7, longitude: -74.0, radiusMeters: 0 } },
      { radiusFilter: true }
    );
    expect(params.has('radius_meters')).toBe(false);
  });
});
