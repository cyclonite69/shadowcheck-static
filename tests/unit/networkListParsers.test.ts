import { parseNetworkIdentity } from '../../server/src/api/routes/v1/networks/list/parsers/networkIdentity';
import { parsePagination } from '../../server/src/api/routes/v1/networks/list/parsers/pagination';
import { parseSignalFilters } from '../../server/src/api/routes/v1/networks/list/parsers/signalFilters';
import { parseSpatialFilters } from '../../server/src/api/routes/v1/networks/list/parsers/spatialFilters';
import { parseThreatFilters } from '../../server/src/api/routes/v1/networks/list/parsers/threatFilters';

describe('network identity parser', () => {
  it('returns empty defaults when filters are omitted', () => {
    expect(
      parseNetworkIdentity(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      )
    ).toEqual({
      ok: true,
      params: {
        ssidPattern: null,
        bssidList: null,
        quickSearchPattern: null,
        manufacturer: null,
        radioTypes: null,
        encryptionTypes: null,
        authMethods: null,
        insecureFlags: null,
        securityFlags: null,
        requireMacForBssid: false,
      },
    });
  });

  it('normalizes identity and security filters', () => {
    const result = parseNetworkIdentity(
      'Police',
      'aa:bb:cc:dd:ee:ff',
      'quick',
      'Vendor',
      'w,e',
      'WPA2,WPA3',
      'PSK,SAE',
      'open,wep',
      'secure'
    );

    expect(result).toEqual({
      ok: true,
      params: expect.objectContaining({
        ssidPattern: 'Police',
        bssidList: ['AA:BB:CC:DD:EE:FF'],
        quickSearchPattern: 'quick',
        manufacturer: 'Vendor',
        radioTypes: ['W', 'E'],
        encryptionTypes: ['WPA2', 'WPA3'],
        authMethods: ['PSK', 'SAE'],
        insecureFlags: ['open', 'wep'],
        securityFlags: ['secure'],
        requireMacForBssid: true,
      }),
    });
  });

  it('disables WiFi-only BSSID requirements when cellular types are present', () => {
    const result = parseNetworkIdentity(
      undefined,
      undefined,
      undefined,
      undefined,
      'W,L',
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({ radioTypes: ['W', 'L'], requireMacForBssid: false }),
      })
    );
  });

  it('requires MAC-style BSSIDs only for WiFi/BLE/Bluetooth radio filters', () => {
    const wifiOnly = parseNetworkIdentity(
      undefined,
      undefined,
      undefined,
      undefined,
      'w,b,e',
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(wifiOnly).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({ radioTypes: ['W', 'B', 'E'], requireMacForBssid: true }),
      })
    );

    const noTypes = parseNetworkIdentity(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(noTypes).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({ radioTypes: null, requireMacForBssid: false }),
      })
    );
  });

  it('normalizes empty comma filters to null while trimming non-empty values', () => {
    const result = parseNetworkIdentity(
      undefined,
      undefined,
      undefined,
      undefined,
      ' , ',
      ' WPA2, WPA3 ',
      ' ',
      '',
      undefined
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({
          radioTypes: null,
          encryptionTypes: ['WPA2', 'WPA3'],
          authMethods: null,
          insecureFlags: null,
        }),
      })
    );
  });

  it.each([
    ['ssid', ['', undefined, undefined, undefined]],
    ['bssid', [undefined, 'invalid bssid!', undefined, undefined]],
    ['q', [undefined, undefined, '', undefined]],
    ['manufacturer', [undefined, undefined, undefined, '']],
  ])('rejects invalid %s input', (_name, args) => {
    const result = parseNetworkIdentity(
      args[0],
      args[1],
      args[2],
      args[3],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(result.ok).toBe(false);
  });
});

describe('threat filter parser', () => {
  it('normalizes threat levels, category aliases, and score bounds', () => {
    expect(parseThreatFilters('HIGH', '["critical","medium","custom"]', '10', '90')).toEqual({
      ok: true,
      params: {
        threatLevel: 'HIGH',
        threatCategories: ['CRITICAL', 'MED', 'CUSTOM'],
        threatScoreMin: 10,
        threatScoreMax: 90,
      },
    });
  });

  it('accepts an array and returns null for empty categories', () => {
    expect(parseThreatFilters(undefined, [], undefined, undefined)).toEqual({
      ok: true,
      params: {
        threatLevel: null,
        threatCategories: null,
        threatScoreMin: null,
        threatScoreMax: null,
      },
    });
  });

  it.each([
    ['invalid level', 'urgent', undefined, undefined, undefined, 'Invalid threat_level'],
    ['low minimum', undefined, undefined, '-1', undefined, 'Invalid threat_score_min'],
    ['high maximum', undefined, undefined, undefined, '101', 'Invalid threat_score_max'],
  ])('rejects %s', (_name, level, categories, min, max, message) => {
    const result = parseThreatFilters(level, categories, min, max);
    expect(result).toEqual(
      expect.objectContaining({ ok: false, error: expect.stringContaining(message) })
    );
  });

  it('treats malformed threat category JSON as an omitted category filter', () => {
    expect(parseThreatFilters(undefined, '{"bad":', undefined, undefined)).toEqual({
      ok: true,
      params: {
        threatLevel: null,
        threatCategories: null,
        threatScoreMin: null,
        threatScoreMax: null,
      },
    });
  });

  it('ignores empty threat category arrays and filters falsey category values', () => {
    expect(parseThreatFilters(undefined, '[]', undefined, undefined)).toEqual({
      ok: true,
      params: {
        threatLevel: null,
        threatCategories: null,
        threatScoreMin: null,
        threatScoreMax: null,
      },
    });

    expect(parseThreatFilters(undefined, ['high', '', 'custom'], undefined, undefined)).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({ threatCategories: ['HIGH', 'CUSTOM'] }),
      })
    );
  });
});

describe('signal filter parser', () => {
  it('normalizes array last_seen, numeric bounds, and default min observation count', () => {
    const result = parseSignalFilters(['2026-06-01T12:00:00Z'], '-90', '-20', undefined, '25');

    expect(result).toEqual({
      ok: true,
      params: {
        lastSeen: new Date('2026-06-01T12:00:00Z').toISOString(),
        minSignal: -90,
        maxSignal: -20,
        minObsCount: 1,
        maxObsCount: 25,
      },
    });
  });

  it.each([
    ['last_seen', 'bad-date', undefined, undefined, undefined, undefined],
    ['min_signal', undefined, '', undefined, undefined, undefined],
    ['max_signal', undefined, undefined, '', undefined, undefined],
    ['min_obs_count', undefined, undefined, undefined, '-1', undefined],
    ['max_obs_count', undefined, undefined, undefined, undefined, '-1'],
  ])('rejects invalid %s input', (_name, lastSeen, minSignal, maxSignal, minObs, maxObs) => {
    const result = parseSignalFilters(lastSeen, minSignal, maxSignal, minObs, maxObs);
    expect(result).toEqual(expect.objectContaining({ ok: false, status: 400 }));
  });
});

describe('spatial filter parser', () => {
  it('accepts valid distance, bbox, radius, and location mode values', () => {
    const result = parseSpatialFilters(
      'weighted_centroid',
      '10.5',
      '2',
      '50',
      '42',
      '44',
      '-84',
      '-82',
      '43',
      '-83',
      '1500'
    );

    expect(result).toEqual({
      ok: true,
      params: {
        locationMode: 'weighted_centroid',
        distanceFromHomeKm: 10.5,
        distanceFromHomeMinKm: 2,
        distanceFromHomeMaxKm: 50,
        bboxMinLat: 42,
        bboxMaxLat: 44,
        bboxMinLng: -84,
        bboxMaxLng: -82,
        radiusCenterLat: 43,
        radiusCenterLng: -83,
        radiusMeters: 1500,
      },
    });
  });

  it('falls back invalid location mode and drops invalid bbox/radius values', () => {
    const result = parseSpatialFilters(
      'bad-mode',
      undefined,
      undefined,
      undefined,
      '95',
      '44',
      '-84',
      '-82',
      '43',
      '-83',
      '-1'
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({
          locationMode: 'latest_observation',
          bboxMinLat: null,
          radiusMeters: null,
        }),
      })
    );
  });

  it.each([
    ['distance_from_home_km', '-1', undefined, undefined],
    ['distance_from_home_km_min', undefined, '-1', undefined],
    ['distance_from_home_km_max', undefined, undefined, '-1'],
  ])('rejects invalid %s input', (_name, distance, min, max) => {
    const result = parseSpatialFilters(
      'latest_observation',
      distance,
      min,
      max,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(result).toEqual(expect.objectContaining({ ok: false, status: 400 }));
  });
});

describe('pagination parser', () => {
  it('returns parsed limit and offset at valid boundaries', () => {
    expect(parsePagination('1', '0')).toEqual({
      ok: true,
      params: { limit: 1, offset: 0 },
    });
  });

  it.each([
    ['missing limit', undefined, '0', 'Missing limit parameter.'],
    ['invalid limit', '0', '0', 'Invalid limit parameter.'],
    ['missing offset', '100', undefined, 'Missing offset parameter.'],
    ['invalid offset', '100', '-1', 'Invalid offset parameter.'],
  ])('rejects %s', (_name, limit, offset, message) => {
    expect(parsePagination(limit, offset)).toEqual(
      expect.objectContaining({ ok: false, status: 400, error: expect.stringContaining(message) })
    );
  });
});
