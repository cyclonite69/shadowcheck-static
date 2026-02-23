export {};

import { UniversalFilterQueryBuilder } from '../../server/src/services/filterQueryBuilder';

type CaseDef = { name: string; filters: Record<string, unknown>; enabled: Record<string, boolean> };

const PAIRWISE_CASES: CaseDef[] = [
  {
    name: 'radioTypes + threatCategories',
    filters: { radioTypes: ['W'], threatCategories: ['high'] },
    enabled: { radioTypes: true, threatCategories: true },
  },
  {
    name: 'manufacturer + observationCountMin',
    filters: { manufacturer: 'AABBCC', observationCountMin: 10 },
    enabled: { manufacturer: true, observationCountMin: true },
  },
  {
    name: 'securityFlags + rssiMin',
    filters: { securityFlags: ['enterprise'], rssiMin: -75 },
    enabled: { securityFlags: true, rssiMin: true },
  },
  {
    name: 'boundingBox + timeframe',
    filters: {
      boundingBox: { north: 40.9, south: 40.5, east: -73.7, west: -74.3 },
      timeframe: { type: 'relative', relativeWindow: '30d' },
    },
    enabled: { boundingBox: true, timeframe: true },
  },
  {
    name: 'has_notes + tag_type',
    filters: { has_notes: true, tag_type: ['threat', 'ignore'] },
    enabled: { has_notes: true, tag_type: true },
  },
];

const TRIPLET_CASES: CaseDef[] = [
  {
    name: 'radioTypes + threatCategories + timeframe',
    filters: {
      radioTypes: ['W'],
      threatCategories: ['critical'],
      timeframe: { type: 'relative', relativeWindow: '7d' },
    },
    enabled: { radioTypes: true, threatCategories: true, timeframe: true },
  },
  {
    name: 'manufacturer + boundingBox + observationCountMin',
    filters: {
      manufacturer: 'Apple',
      boundingBox: { north: 40.9, south: 40.5, east: -73.7, west: -74.3 },
      observationCountMin: 20,
    },
    enabled: { manufacturer: true, boundingBox: true, observationCountMin: true },
  },
  {
    name: 'securityFlags + rssiMin + distanceFromHomeMax',
    filters: { securityFlags: ['insecure'], rssiMin: -80, distanceFromHomeMax: 25 },
    enabled: { securityFlags: true, rssiMin: true, distanceFromHomeMax: true },
  },
];

describe('Filter audit matrix harness', () => {
  test.each(PAIRWISE_CASES)('pairwise: %s', ({ filters, enabled }) => {
    const result = new UniversalFilterQueryBuilder(filters, enabled, { pageType: 'wigle' }).buildNetworkListQuery();
    expect(result.sql.length).toBeGreaterThan(0);
    expect(result.appliedFilters.length + result.ignoredFilters.length).toBeGreaterThan(0);
  });

  test.each(TRIPLET_CASES)('triplet: %s', ({ filters, enabled }) => {
    const result = new UniversalFilterQueryBuilder(filters, enabled, { pageType: 'wigle' }).buildGeospatialQuery();
    expect(result.sql).toContain('filtered_obs');
    expect(Array.isArray(result.params)).toBe(true);
  });

  test('full-stack smoke test', () => {
    const filters = {
      ssid: 'Audit',
      bssid: 'AA:BB',
      manufacturer: 'AABBCC',
      radioTypes: ['W'],
      frequencyBands: ['5GHz'],
      channelMin: 1,
      rssiMin: -80,
      encryptionTypes: ['WPA2'],
      securityFlags: ['enterprise'],
      timeframe: { type: 'relative', relativeWindow: '7d' },
      observationCountMin: 5,
      has_notes: false,
      tag_type: ['threat'],
      gpsAccuracyMax: 200,
      excludeInvalidCoords: true,
      distanceFromHomeMax: 50,
      threatScoreMin: 20,
      threatCategories: ['low'],
    };
    const enabled = Object.keys(filters).reduce((acc, key) => {
      (acc as Record<string, boolean>)[key] = true;
      return acc;
    }, {} as Record<string, boolean>);

    const result = new UniversalFilterQueryBuilder(filters, enabled, { pageType: 'wigle' }).buildNetworkCountQuery();
    expect(result.sql).toContain('SELECT COUNT');
    expect(Array.isArray(result.params)).toBe(true);
  });
});
