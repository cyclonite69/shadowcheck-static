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

describe('import-missing-geocodes', () => {
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

  it('parses CSV and updates legacy locations in database', async () => {
    const csvContent = `id,latitude,longitude,address
123,42.12,-83.45,"123 Main St, Detroit, MI"
456,42.13,-83.46,456 Oak Ave
789,42.14,-83.47,
invalid_line_no_match
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
      require('../../../scripts/geocoding/import-missing-geocodes');
    });

    await endPromise;

    expect(readFileSync).toHaveBeenCalledWith('missing_geocodes_result.csv', 'utf8');
    // It should update id 123 and 456, but skip 789 (empty address) and invalid_line
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE app.locations_legacy SET geocoded_address = $1'),
      ['123 Main St, Detroit, MI', '123']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE app.locations_legacy SET geocoded_address = $1'),
      ['456 Oak Ave', '456']
    );
    expect(logSpy).toHaveBeenCalledWith('✓ Updated 2 addresses');
    expect(mockEnd).toHaveBeenCalled();
  });
});
