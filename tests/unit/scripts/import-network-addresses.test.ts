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

describe('import-network-addresses', () => {
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

  it('parses CSV, updates databases and handles modulo logs', async () => {
    delete process.env.DB_PORT;
    process.argv = ['node', 'script.js'];

    // Generate 1001 lines to trigger the updated % 1000 === 0 branch
    let csvContent = 'bssid,lat,lon,address\n';
    for (let i = 1; i <= 1001; i++) {
      csvContent += `BSSID-${i},42.12,-83.45,"Address ${i}"\n`;
    }

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
      require('../../../scripts/geocoding/import-network-addresses');
    });

    await endPromise;

    expect(readFileSync).toHaveBeenCalledWith('networks_batch_geocoded.csv', 'utf8');
    // Each record updates legacy networks and ap_locations
    expect(mockQuery).toHaveBeenCalledTimes(2002);
    expect(logSpy).toHaveBeenCalledWith('  1000...');
    expect(logSpy).toHaveBeenCalledWith('✓ Updated 1001 network addresses');
    expect(mockEnd).toHaveBeenCalled();
  });

  it('skips empty address and supports custom filename', async () => {
    process.argv = ['node', 'script.js', 'custom_file.csv'];
    const csvContent = `bssid,lat,lon,address
BSSID-1,42.12,-83.45,""
BSSID-2,42.12,-83.45,
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
      require('../../../scripts/geocoding/import-network-addresses');
    });

    await endPromise;

    expect(readFileSync).toHaveBeenCalledWith('custom_file.csv', 'utf8');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('✓ Updated 0 network addresses');
    expect(mockEnd).toHaveBeenCalled();
  });

  it('catches and logs errors', async () => {
    (readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Read failed');
    });

    let resolveError: () => void;
    const errorPromise = new Promise<void>((resolve) => {
      resolveError = resolve;
    });
    errorSpy.mockImplementation(() => {
      resolveError();
    });

    jest.isolateModules(() => {
      require('../../../scripts/geocoding/import-network-addresses');
    });

    await errorPromise;

    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
  });
});
