import { readFileSync } from 'fs';

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
  readFileSync: jest.fn(),
}));

describe('import-ap-addresses', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let originalArgv: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('parses geocoded AP CSV and updates database (default filename)', async () => {
    delete process.env.DB_PORT;
    process.argv = ['node', 'script.js']; // Default filename branch

    const csvContent = `bssid,lat,lon,address
AA:BB:CC:DD:EE:FF,42.12,-83.45,"123 Main St, Detroit, MI"
11:22:33:44:55:66,42.13,-83.46,456 Oak Ave
78:90:12:34:56:78,42.14,-83.47,
`;

    (readFileSync as jest.Mock).mockReturnValue(csvContent);
    mockQuery.mockResolvedValue({ rowCount: 1 });

    let resolveEnd: () => void;
    const endPromise = new Promise<void>((resolve) => {
      resolveEnd = resolve;
    });
    mockEnd.mockImplementation(() => {
      resolveEnd();
      return Promise.resolve();
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/import-ap-addresses');
    });

    await endPromise;

    expect(readFileSync).toHaveBeenCalledWith('ap_centroids_geocoded.csv', 'utf8');
    // AA:BB... and 11:22... should be updated. 78:90... has empty address and should be skipped.
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'UPDATE app.ap_locations SET trilat_address = $1 WHERE bssid = $2',
      ['123 Main St, Detroit, MI', 'AA:BB:CC:DD:EE:FF']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'UPDATE app.ap_locations SET trilat_address = $1 WHERE bssid = $2',
      ['456 Oak Ave', '11:22:33:44:55:66']
    );
    expect(logSpy).toHaveBeenCalledWith('✓ Updated 2 AP addresses');
    expect(mockEnd).toHaveBeenCalled();
  });

  it('supports custom filename and custom DB_PORT', async () => {
    process.env.DB_PORT = '5433';
    process.argv = ['node', 'script.js', 'custom_ap_geocoded.csv'];

    (readFileSync as jest.Mock).mockReturnValue('bssid,lat,lon,address\n');
    mockQuery.mockResolvedValue({ rowCount: 0 });

    let resolveEnd: () => void;
    const endPromise = new Promise<void>((resolve) => {
      resolveEnd = resolve;
    });
    mockEnd.mockImplementation(() => {
      resolveEnd();
      return Promise.resolve();
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/import-ap-addresses');
    });

    await endPromise;

    expect(readFileSync).toHaveBeenCalledWith('custom_ap_geocoded.csv', 'utf8');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockEnd).toHaveBeenCalled();
  });
});
