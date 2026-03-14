import { UniversalFilterQueryBuilder } from '../../server/src/services/filterQueryBuilder/universalFilterQueryBuilder';

describe('Systematic Filter Testing', () => {
  const getApplied = (filters: any, enabled: any) => {
    const builder = new UniversalFilterQueryBuilder(filters, enabled);
    const { appliedFilters } = builder.buildNetworkListQuery();
    return appliedFilters.map((f: any) => f.field);
  };

  test('bssid filter', () => {
    expect(getApplied({ bssid: '00:11:22:33:44:55' }, { bssid: true })).toContain('bssid');
    expect(getApplied({ bssid: '00:11:22' }, { bssid: true })).toContain('bssid');
  });

  test('manufacturer filter', () => {
    expect(getApplied({ manufacturer: 'Apple' }, { manufacturer: true })).toContain('manufacturer');
    expect(getApplied({ manufacturer: '00:11:22' }, { manufacturer: true })).toContain(
      'manufacturerOui'
    );
  });

  test('radioTypes filter', () => {
    expect(getApplied({ radioTypes: ['W', 'L'] }, { radioTypes: true })).toContain('radioTypes');
  });

  test('frequencyBands filter', () => {
    expect(getApplied({ frequencyBands: ['2.4GHz'] }, { frequencyBands: true })).toContain(
      'frequencyBands'
    );
  });

  test('channel filters', () => {
    expect(getApplied({ channelMin: 1 }, { channelMin: true })).toContain('channelMin');
    expect(getApplied({ channelMax: 11 }, { channelMax: true })).toContain('channelMax');
  });

  test('RSSI filters', () => {
    expect(getApplied({ rssiMin: -70 }, { rssiMin: true })).toContain('rssiMin');
    expect(getApplied({ rssiMax: -30 }, { rssiMax: true })).toContain('rssiMax');
  });

  test('encryptionTypes filter', () => {
    expect(getApplied({ encryptionTypes: ['WPA2'] }, { encryptionTypes: true })).toContain(
      'encryptionTypes'
    );
  });

  test('securityFlags filter', () => {
    expect(getApplied({ securityFlags: ['enterprise'] }, { securityFlags: true })).toContain(
      'securityFlags'
    );
  });

  test('timeframe filter', () => {
    expect(
      getApplied({ timeframe: { type: 'relative', relativeWindow: '30d' } }, { timeframe: true })
    ).toContain('timeframe');
  });

  test('observationCountMin filter', () => {
    expect(getApplied({ observationCountMin: 5 }, { observationCountMin: true })).toContain(
      'observationCountMin'
    );
  });

  test('observationCountMax filter', () => {
    expect(getApplied({ observationCountMax: 100 }, { observationCountMax: true })).toContain(
      'observationCountMax'
    );
  });

  test('gpsAccuracyMax filter', () => {
    expect(getApplied({ gpsAccuracyMax: 10 }, { gpsAccuracyMax: true })).toContain(
      'gpsAccuracyMax'
    );
  });

  test('excludeInvalidCoords filter', () => {
    expect(getApplied({}, { excludeInvalidCoords: true })).toContain('excludeInvalidCoords');
  });

  test('distanceFromHome filters', () => {
    expect(getApplied({ distanceFromHomeMin: 10 }, { distanceFromHomeMin: true })).toContain(
      'distanceFromHomeMin'
    );
    expect(getApplied({ distanceFromHomeMax: 100 }, { distanceFromHomeMax: true })).toContain(
      'distanceFromHomeMax'
    );
  });

  test('boundingBox filter', () => {
    expect(
      getApplied({ boundingBox: { north: 1, south: 0, east: 1, west: 0 } }, { boundingBox: true })
    ).toContain('boundingBox');
  });

  test('radiusFilter filter', () => {
    expect(
      getApplied(
        { radiusFilter: { latitude: 0, longitude: 0, radiusMeters: 100 } },
        { radiusFilter: true }
      )
    ).toContain('radiusFilter');
  });

  test('threatScore filters', () => {
    expect(getApplied({ threatScoreMin: 20 }, { threatScoreMin: true })).toContain(
      'threatScoreMin'
    );
    expect(getApplied({ threatScoreMax: 80 }, { threatScoreMax: true })).toContain(
      'threatScoreMax'
    );
  });

  test('threatCategories filter', () => {
    expect(getApplied({ threatCategories: ['critical'] }, { threatCategories: true })).toContain(
      'threatCategories'
    );
  });

  test('stationaryConfidence filters', () => {
    expect(
      getApplied({ stationaryConfidenceMin: 0.5 }, { stationaryConfidenceMin: true })
    ).toContain('stationaryConfidenceMin');
    expect(
      getApplied({ stationaryConfidenceMax: 0.9 }, { stationaryConfidenceMax: true })
    ).toContain('stationaryConfidenceMax');
  });

  test('has_notes filter', () => {
    expect(getApplied({ has_notes: true }, { has_notes: true })).toContain('has_notes');
  });

  test('tag_type filter', () => {
    expect(getApplied({ tag_type: ['threat'] }, { tag_type: true })).toContain('tag_type');
  });
});
