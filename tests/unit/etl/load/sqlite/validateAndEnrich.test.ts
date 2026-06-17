import { validateAndEnrich as validateSqliteObservation } from '../../../../../etl/load/sqlite/validateAndEnrich';

const locationRow = {
  _id: 7,
  bssid: 'aa:bb:cc:dd:ee:ff',
  level: -47,
  lat: 43.02,
  lon: -83.69,
  altitude: 12,
  accuracy: 5,
  time: Date.UTC(2026, 0, 1),
  external: 1,
  mfgrid: 9,
};

describe('etl/load/sqlite/validateAndEnrich', () => {
  it('defaults absent network metadata and records errors on validation failure', () => {
    const valid = validateSqliteObservation(locationRow, new Map(), 'sqlite_tag', []);
    expect(valid).toMatchObject({
      bssid: 'AA:BB:CC:DD:EE:FF',
      ssid: null,
      radio_type: 'W',
      radio_frequency: null,
      altitude: 12,
      accuracy: 5,
      external: true,
    });

    const errors: string[] = [];
    const invalid = validateSqliteObservation(
      { ...locationRow, lon: -999 },
      new Map(),
      'sqlite_tag',
      errors
    );
    expect(invalid).toBeNull();
    expect(errors[0]).toContain('Validation failed for AA:BB:CC:DD:EE:FF (7)');
  });
});
