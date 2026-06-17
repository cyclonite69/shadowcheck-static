import { validateAndEnrich as validateWigleObservation } from '../../../../../etl/load/wigle/transformer';

const mockLogDeadLetter = jest.fn();

jest.mock('../../../../../etl/utils/deadLetter', () => ({
  logDeadLetter: (...args: unknown[]) => mockLogDeadLetter(...args),
}));

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

const networkRow = {
  bssid: 'AA:BB:CC:DD:EE:FF',
  ssid: ' Test\x00 Network ',
  frequency: 2412,
  capabilities: ' [WPA2]\x00 ',
  lasttime: Date.UTC(2026, 0, 2),
  lastlat: 43.03,
  lastlon: -83.7,
  type: 'W',
  bestlevel: -41,
  bestlat: 43.03,
  bestlon: -83.7,
  rcois: ' rcoi\x00 ',
  mfgrid: 9,
  service: ' svc\x00 ',
};

describe('etl/load/wigle/transformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uppercases BSSID and cleans nullable network strings', () => {
    const result = validateWigleObservation(
      locationRow,
      new Map([[networkRow.bssid, networkRow]]),
      'field_unit'
    );

    expect(result).toMatchObject({
      source_pk: '7',
      device_id: 'field_unit',
      bssid: 'AA:BB:CC:DD:EE:FF',
      ssid: 'Test Network',
      radio_capabilities: '[WPA2]',
      radio_service: 'svc',
      radio_rcois: 'rcoi',
      external: true,
      mfgrid: 9,
    });
  });

  it('dead-letters invalid coordinates', () => {
    const result = validateWigleObservation(
      { ...locationRow, lat: 999 },
      new Map([[networkRow.bssid, networkRow]]),
      'field_unit'
    );

    expect(result).toBeNull();
    expect(mockLogDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({ bssid: 'AA:BB:CC:DD:EE:FF' }),
      expect.stringContaining('Validation failed')
    );
  });
});
