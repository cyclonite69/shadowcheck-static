import { Pool } from 'pg';
import { WiGLEImporter } from '../../../../../etl/load/wigle/importer';
import { SqliteReader } from '../../../../../etl/load/wigle/reader';
import { ObservationLoader } from '../../../../../etl/load/wigle/loader';
import { validateAndEnrich } from '../../../../../etl/load/wigle/transformer';

const mockLoadNetworkCache = jest.fn();
const mockFetchNewObservations = jest.fn();
const mockInsertBatch = jest.fn();
const mockValidateAndEnrich = jest.fn();

jest.mock('../../../../../etl/load/wigle/reader', () => ({
  SqliteReader: jest.fn(),
}));

jest.mock('../../../../../etl/load/wigle/loader', () => ({
  ObservationLoader: jest.fn(),
}));

jest.mock('../../../../../etl/load/wigle/transformer', () => ({
  validateAndEnrich: jest.fn(),
}));

describe('wigle/importer', () => {
  let mockPool: Partial<Pool>;
  let logSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPool = {};
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    (SqliteReader as jest.Mock).mockImplementation(() => ({
      loadNetworkCache: mockLoadNetworkCache,
      fetchNewObservations: mockFetchNewObservations,
    }));

    (ObservationLoader as jest.Mock).mockImplementation(() => ({
      insertBatch: mockInsertBatch,
    }));

    (validateAndEnrich as jest.Mock).mockImplementation(mockValidateAndEnrich);

    mockLoadNetworkCache.mockReset();
    mockFetchNewObservations.mockReset();
    mockInsertBatch.mockReset();
    mockValidateAndEnrich.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  it('runs importer with zero observations and completes successfully', async () => {
    mockLoadNetworkCache.mockResolvedValue(new Map());
    mockFetchNewObservations.mockResolvedValue([]);

    const importer = new WiGLEImporter('test.sqlite', 'field_1', mockPool as Pool, {
      BATCH_SIZE: 10,
      DEBUG: false,
    });

    const result = await importer.start(0);

    expect(result).toEqual({
      imported: 0,
      failed: 0,
      errors: [],
    });

    expect(mockLoadNetworkCache).toHaveBeenCalledTimes(1);
    expect(mockFetchNewObservations).toHaveBeenCalledWith(0);
    expect(mockInsertBatch).not.toHaveBeenCalled();
  });

  it('processes rows in batches and prints progress updates', async () => {
    const mockCache = new Map();
    mockLoadNetworkCache.mockResolvedValue(mockCache);

    const mockRows = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
    mockFetchNewObservations.mockResolvedValue(mockRows);

    mockValidateAndEnrich
      .mockReturnValueOnce({ id: 1 })
      .mockReturnValueOnce(null) // Mock one validation failure
      .mockReturnValueOnce({ id: 3 });

    mockInsertBatch
      .mockResolvedValueOnce(1) // batch 1 (size 1)
      .mockResolvedValueOnce(1); // final batch (size 1)

    const importer = new WiGLEImporter('test.sqlite', 'field_1', mockPool as Pool, {
      BATCH_SIZE: 1, // trigger batch write on every valid record
      DEBUG: true,
    });

    const result = await importer.start(1000);

    expect(result).toEqual({
      imported: 2,
      failed: 1,
      errors: [],
    });

    expect(mockValidateAndEnrich).toHaveBeenCalledTimes(3);
    expect(mockValidateAndEnrich).toHaveBeenNthCalledWith(1, mockRows[0], mockCache, 'field_1');

    expect(mockInsertBatch).toHaveBeenCalledTimes(2);
    expect(mockInsertBatch).toHaveBeenNthCalledWith(1, [{ id: 1 }]);
    expect(mockInsertBatch).toHaveBeenNthCalledWith(2, [{ id: 3 }]);

    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('handles last batch correctly if remaining items do not fill a batch', async () => {
    mockLoadNetworkCache.mockResolvedValue(new Map());
    const mockRows = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
    mockFetchNewObservations.mockResolvedValue(mockRows);

    mockValidateAndEnrich
      .mockReturnValueOnce({ id: 1 })
      .mockReturnValueOnce({ id: 2 })
      .mockReturnValueOnce({ id: 3 });

    mockInsertBatch
      .mockResolvedValueOnce(2) // first batch of size 2
      .mockResolvedValueOnce(1); // final batch of size 1

    const importer = new WiGLEImporter('test.sqlite', 'field_1', mockPool as Pool, {
      BATCH_SIZE: 2,
      DEBUG: false,
    });

    const result = await importer.start(2000);

    expect(result).toEqual({
      imported: 3,
      failed: 0,
      errors: [],
    });

    expect(mockInsertBatch).toHaveBeenCalledTimes(2);
    expect(mockInsertBatch).toHaveBeenNthCalledWith(1, [{ id: 1 }, { id: 2 }]);
    expect(mockInsertBatch).toHaveBeenNthCalledWith(2, [{ id: 3 }]);
  });
});
