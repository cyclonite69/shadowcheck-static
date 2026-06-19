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

describe('import-final-geocodes', () => {
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

  it('parses CSV and updates legacy locations in database (default DB_PORT)', async () => {
    delete process.env.DB_PORT;

    const csvContent = `id,lat,lon,address
unified-123,42.12,-83.45,"123 Main St, Detroit, MI"
unified-456,42.13,-83.46,456 Oak Ave
unified-789,42.14,-83.47,
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
      require('../../../scripts/geocoding/import-final-geocodes');
    });

    await endPromise;

    expect(readFileSync).toHaveBeenCalledWith('missing_final_result.csv', 'utf8');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        "UPDATE app.locations_legacy SET geocoded_address = $1, geocoded_at = NOW(), geocode_source = 'mapbox_reverse' WHERE unified_id = $2"
      ),
      ['123 Main St, Detroit, MI', 'unified-123']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "UPDATE app.locations_legacy SET geocoded_address = $1, geocoded_at = NOW(), geocode_source = 'mapbox_reverse' WHERE unified_id = $2"
      ),
      ['456 Oak Ave', 'unified-456']
    );
    expect(logSpy).toHaveBeenCalledWith('✓ Updated 2 addresses');
    expect(mockEnd).toHaveBeenCalled();
  });

  it('handles explicit DB_PORT env var', async () => {
    process.env.DB_PORT = '5433';
    (readFileSync as jest.Mock).mockReturnValue('id,lat,lon,address\n');
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
      require('../../../scripts/geocoding/import-final-geocodes');
    });

    await endPromise;
    expect(mockEnd).toHaveBeenCalled();
  });
});
