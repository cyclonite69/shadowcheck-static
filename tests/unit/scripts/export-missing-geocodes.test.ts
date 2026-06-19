import { writeFileSync } from 'fs';

const mockQuery = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockEnd,
  })),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
}));

describe('export-missing-geocodes', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('queries legacy locations and writes them to CSV', async () => {
    // Delete DB_PORT to trigger default fallback branch
    delete process.env.DB_PORT;

    const mockRows = [
      { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'TestSSID', lat: 42.123, lon: -83.456 },
      { bssid: '11:22:33:44:55:66', ssid: null, lat: 42.987, lon: -83.123 },
    ];

    mockQuery.mockResolvedValue({ rows: mockRows });

    let resolveEnd: () => void;
    const endPromise = new Promise<void>((resolve) => {
      resolveEnd = resolve;
    });
    mockEnd.mockImplementation(() => {
      resolveEnd();
      return Promise.resolve();
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/export-missing-geocodes');
    });

    await endPromise;

    expect(mockQuery).toHaveBeenCalled();
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT DISTINCT');
    expect(mockQuery.mock.calls[0][0]).toContain('FROM app.locations_legacy');

    expect(writeFileSync).toHaveBeenCalledWith(
      'locations_to_reverse_geocode.csv',
      'lat,lon,bssid,ssid\n42.123,-83.456,AA:BB:CC:DD:EE:FF,TestSSID\n42.987,-83.123,11:22:33:44:55:66,'
    );

    expect(logSpy).toHaveBeenCalledWith(
      '✓ Exported 2 locations to locations_to_reverse_geocode.csv'
    );
    expect(mockEnd).toHaveBeenCalled();
  });

  it('handles explicit DB_PORT env var', async () => {
    process.env.DB_PORT = '5433';
    mockQuery.mockResolvedValue({ rows: [] });

    let resolveEnd: () => void;
    const endPromise = new Promise<void>((resolve) => {
      resolveEnd = resolve;
    });
    mockEnd.mockImplementation(() => {
      resolveEnd();
      return Promise.resolve();
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/export-missing-geocodes');
    });

    await endPromise;
    expect(mockEnd).toHaveBeenCalled();
  });
});
