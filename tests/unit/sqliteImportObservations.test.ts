import type { Pool } from 'pg';
import type {
  BatchResult,
  SqliteLocationRow,
  SqliteNetworkRow,
  ValidatedObservation,
} from '../../etl/load/sqlite/types';
import {
  importObservationRows,
  type ObservationImportProgress,
} from '../../etl/load/sqlite/importObservations';

describe('sqlite import observation use case', () => {
  const pool = {} as Pool;
  const rows: SqliteLocationRow[] = [
    {
      _id: 1,
      bssid: 'AA:BB:CC',
      level: -50,
      lat: 1,
      lon: 2,
      altitude: 0,
      accuracy: 0,
      time: 1000,
      external: 0,
      mfgrid: 0,
    },
    {
      _id: 2,
      bssid: 'DD:EE:FF',
      level: -60,
      lat: 3,
      lon: 4,
      altitude: 0,
      accuracy: 0,
      time: 2000,
      external: 0,
      mfgrid: 0,
    },
  ];
  const networkCache = new Map<string, SqliteNetworkRow>();

  it('imports validated rows in batches and reports progress', async () => {
    const validateAndEnrichFn = jest
      .fn()
      .mockReturnValueOnce({ source_pk: '1' } as ValidatedObservation)
      .mockReturnValueOnce({ source_pk: '2' } as ValidatedObservation);
    const insertBatchFn = jest
      .fn<Promise<BatchResult>, [Pool, ValidatedObservation[], boolean]>()
      .mockResolvedValue({ inserted: 2, failed: 0, errors: [] });
    const onProgress = jest.fn<void, [ObservationImportProgress]>();

    const result = await importObservationRows({
      rows,
      networkCache,
      sourceTag: 'test_source',
      pool,
      batchSize: 2,
      debug: false,
      initialImported: 5,
      onProgress,
      validateAndEnrichFn,
      insertBatchFn,
    });

    expect(result).toEqual({ imported: 2, failed: 0, errors: [] });
    expect(insertBatchFn).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        imported: 7,
        processedRows: 2,
        totalRows: 2,
      })
    );
  });

  it('counts validation failures and final batch errors', async () => {
    const validateAndEnrichFn = jest
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ source_pk: '2' } as ValidatedObservation);
    const insertBatchFn = jest
      .fn<Promise<BatchResult>, [Pool, ValidatedObservation[], boolean]>()
      .mockRejectedValue(new Error('Insert failed'));

    const result = await importObservationRows({
      rows,
      networkCache,
      sourceTag: 'test_source',
      pool,
      batchSize: 10,
      debug: false,
      validateAndEnrichFn,
      insertBatchFn,
    });

    expect(result.failed).toBe(1);
    expect(result.errors).toContain('Final batch error: Insert failed');
  });
});
