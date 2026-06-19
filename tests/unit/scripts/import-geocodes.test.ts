import { existsSync, readFileSync } from 'fs';

const actualFs = jest.requireActual('fs');

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
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('import-geocodes', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let originalArgv: string[];
  let existsMockValue = true;
  let readMockValue = '';

  beforeEach(() => {
    jest.clearAllMocks();
    existsMockValue = true;
    readMockValue = '';

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null | undefined) => {
        throw new Error(`process.exit called with ${code}`);
      });
    originalArgv = [...process.argv];
    // Clean process.argv so Jest arguments don't pollute the script's CLI argument parsing
    process.argv = ['node', 'script.js'];

    (existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path === 'locations_reverse_geocoded.csv' || path === 'custom_geocodes.csv') {
        return existsMockValue;
      }
      return actualFs.existsSync(path);
    });

    (readFileSync as jest.Mock).mockImplementation((path: string, options: any) => {
      if (path === 'locations_reverse_geocoded.csv' || path === 'custom_geocodes.csv') {
        return readMockValue;
      }
      return actualFs.readFileSync(path, options);
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('exits if geocodes file does not exist', async () => {
    existsMockValue = false;

    let resolveExit: () => void;
    const exitPromise = new Promise<void>((resolve) => {
      resolveExit = resolve;
    });

    exitSpy.mockImplementation((code?: string | number | null | undefined) => {
      resolveExit();
      throw new Error(`process.exit called with ${code}`);
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/import-geocodes');
    });

    await exitPromise;

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith('❌ File not found: locations_reverse_geocoded.csv');
  });

  it('parses CSV, updates legacy networks, and handles errors', async () => {
    delete process.env.DB_PORT;
    existsMockValue = true;
    readMockValue = `bssid,lat,lon,address,venue
AA:BB:CC:DD:EE:FF,42.123,-83.456,"123 Main St","My Venue"
11:22:33:44:55:66,42.987,-83.123,"456 Oak Ave",
78:90:12:34:56:78,42.000,-83.000,,
invalid_line
`;

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // AA:BB address
      .mockResolvedValueOnce({ rowCount: 1 }) // AA:BB venue
      .mockRejectedValueOnce(new Error('DB failure')) // 11:22 address fail
      .mockResolvedValue({ rowCount: 1 });

    let resolveEnd: () => void;
    const endPromise = new Promise<void>((resolve) => {
      resolveEnd = resolve;
    });
    mockEnd.mockImplementation(() => {
      resolveEnd();
      return Promise.resolve();
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/import-geocodes');
    });

    await endPromise;

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'UPDATE app.networks_legacy SET trilat_address = $1 WHERE bssid = $2',
      ['123 Main St', 'AA:BB:CC:DD:EE:FF']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'UPDATE app.networks_legacy SET venue_name = $1 WHERE bssid = $2',
      ['My Venue', 'AA:BB:CC:DD:EE:FF']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      'UPDATE app.networks_legacy SET trilat_address = $1 WHERE bssid = $2',
      ['456 Oak Ave', '11:22:33:44:55:66']
    );

    expect(errorSpy).toHaveBeenCalledWith('Error updating 11:22:33:44:55:66:', 'DB failure');
    expect(logSpy).toHaveBeenCalledWith('\n✅ Import complete: 2/3 records updated');
    expect(mockEnd).toHaveBeenCalled();
  });

  it('handles explicit DB_PORT and custom argv input file', async () => {
    process.env.DB_PORT = '5433';
    process.argv = ['node', 'script.js', 'custom_geocodes.csv'];
    existsMockValue = true;
    readMockValue = 'bssid,lat,lon,address,venue\n';
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
      require('../../../scripts/geocoding/import-geocodes');
    });

    await endPromise;
    expect(mockEnd).toHaveBeenCalled();
  });
});
