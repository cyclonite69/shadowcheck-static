import { Pool } from 'pg';
import { importObservationRows } from '../../../../../etl/load/sqlite/importObservations';
import type {
  SqliteLocationRow,
  SqliteNetworkRow,
  ValidatedObservation,
} from '../../../../../etl/load/sqlite/types';

describe('sqlite/importObservations', () => {
  let mockPool: Partial<Pool>;
  let mockNetworkCache: Map<string, SqliteNetworkRow>;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPool = {};
    mockNetworkCache = new Map();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const dummyRow = (id: number): SqliteLocationRow => ({
    _id: id,
    bssid: `AA:BB:CC:DD:EE:0${id}`,
    level: -50,
    lat: 37.7749,
    lon: -122.4194,
    altitude: 0,
    accuracy: 0,
    time: 10000 + id,
    external: 0,
    mfgrid: 0,
  });

  const dummyValidated = (id: number): ValidatedObservation => ({
    source_pk: String(id),
    device_id: 'test_device',
    bssid: `AA:BB:CC:DD:EE:0${id}`,
    ssid: 'test_ssid',
    radio_type: 'W',
    radio_frequency: 2412,
    radio_capabilities: 'WPA2',
    radio_service: null,
    radio_rcois: null,
    radio_lasttime_ms: null,
    level: -50,
    lat: 37.7749,
    lon: -122.4194,
    altitude: 0,
    accuracy: 0,
    time: new Date(10000 + id),
    time_ms: 10000 + id,
    observed_at_ms: 10000 + id,
    external: false,
    mfgrid: 0,
    source_tag: 'test_tag',
  });

  it('handles empty rows input', async () => {
    const result = await importObservationRows({
      batchSize: 2,
      debug: false,
      pool: mockPool as Pool,
      rows: [],
      sourceTag: 'test_tag',
      networkCache: mockNetworkCache,
    });

    expect(result).toEqual({ imported: 0, failed: 0, errors: [] });
  });

  it('handles validation failures and skips invalid rows', async () => {
    const rows = [dummyRow(1), dummyRow(2)];
    const validateMock = jest.fn().mockReturnValue(null); // All fail validation

    const result = await importObservationRows({
      batchSize: 2,
      debug: false,
      pool: mockPool as Pool,
      rows,
      sourceTag: 'test_tag',
      validateAndEnrichFn: validateMock,
      networkCache: mockNetworkCache,
    });

    expect(result).toEqual({ imported: 0, failed: 2, errors: [] });
    expect(validateMock).toHaveBeenCalledTimes(2);
  });

  it('processes batches correctly and calls onProgress', async () => {
    const rows = [dummyRow(1), dummyRow(2), dummyRow(3)];
    const validated = [dummyValidated(1), dummyValidated(2), dummyValidated(3)];

    let validateIndex = 0;
    const validateMock = jest.fn().mockImplementation(() => validated[validateIndex++]);

    const insertMock = jest.fn().mockResolvedValue({
      inserted: 2,
      failed: 0,
      errors: [],
    });

    const progressMock = jest.fn();

    const result = await importObservationRows({
      batchSize: 2,
      debug: false,
      pool: mockPool as Pool,
      rows,
      sourceTag: 'test_tag',
      validateAndEnrichFn: validateMock,
      insertBatchFn: insertMock,
      onProgress: progressMock,
      networkCache: mockNetworkCache,
      initialImported: 10,
    });

    // 2 batches should be flushed: first batch has 2, final batch has 1
    expect(result).toEqual({ imported: 4, failed: 0, errors: [] });
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(progressMock).toHaveBeenCalledTimes(1);
    expect(progressMock).toHaveBeenCalledWith({
      imported: 12, // 10 + 2
      processedRows: 2,
      startTime: expect.any(Number),
      totalRows: 3,
    });
  });

  it('handles batch insert throwing errors, logging in debug mode', async () => {
    const rows = [dummyRow(1), dummyRow(2), dummyRow(3)];
    const validated = [dummyValidated(1), dummyValidated(2), dummyValidated(3)];

    let validateIndex = 0;
    const validateMock = jest.fn().mockImplementation(() => validated[validateIndex++]);

    // First batch throws error, second batch succeeds
    const insertMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('Insert error'))
      .mockResolvedValueOnce({
        inserted: 1,
        failed: 0,
        errors: [],
      });

    const result = await importObservationRows({
      batchSize: 2,
      debug: true, // triggers console.error on Batch error
      pool: mockPool as Pool,
      rows,
      sourceTag: 'test_tag',
      validateAndEnrichFn: validateMock,
      insertBatchFn: insertMock,
      networkCache: mockNetworkCache,
    });

    expect(result).toEqual({
      imported: 1,
      failed: 0,
      errors: ['Batch insert error: Insert error'],
    });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Batch error: Insert error'));
  });

  it('handles final batch errors without logging to console.error when debug is true', async () => {
    const rows = [dummyRow(1)];
    const validated = [dummyValidated(1)];

    const validateMock = jest.fn().mockReturnValue(validated[0]);
    const insertMock = jest.fn().mockRejectedValue(new Error('Final insert error'));

    const result = await importObservationRows({
      batchSize: 2,
      debug: true,
      pool: mockPool as Pool,
      rows,
      sourceTag: 'test_tag',
      validateAndEnrichFn: validateMock,
      insertBatchFn: insertMock,
      networkCache: mockNetworkCache,
    });

    expect(result).toEqual({
      imported: 0,
      failed: 0,
      errors: ['Final batch error: Final insert error'],
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
