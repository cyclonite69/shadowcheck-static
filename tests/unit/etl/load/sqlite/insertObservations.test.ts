import { Pool } from 'pg';
import { insertBatch, insertSingleRecord } from '../../../../../etl/load/sqlite/insertObservations';
import type { ValidatedObservation } from '../../../../../etl/load/sqlite/types';

describe('sqlite/insertObservations', () => {
  let mockPool: Partial<Pool>;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
    };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  const dummyRecord = (id: number): ValidatedObservation => ({
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

  describe('insertBatch', () => {
    it('returns empty result when records is empty', async () => {
      const result = await insertBatch(mockPool as Pool, [], false);
      expect(result).toEqual({ inserted: 0, failed: 0, errors: [] });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('performs bulk insert successfully on standard path', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rowCount: 2 });
      const records = [dummyRecord(1), dummyRecord(2)];

      const result = await insertBatch(mockPool as Pool, records, false);
      expect(result).toEqual({ inserted: 2, failed: 0, errors: [] });
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.observations'),
        expect.any(Array)
      );
    });

    it('retries row-by-row on bulk query failure, logging warning in debug mode', async () => {
      // First call (bulk) throws error, subsequent calls (single records) succeed
      mockPool.query = jest
        .fn()
        .mockRejectedValueOnce(new Error('Bulk syntax error'))
        .mockResolvedValue({ rowCount: 1 });

      const records = [dummyRecord(1), dummyRecord(2)];
      const result = await insertBatch(mockPool as Pool, records, true);

      expect(result).toEqual({ inserted: 2, failed: 0, errors: [] });
      expect(mockPool.query).toHaveBeenCalledTimes(3); // 1 bulk + 2 single
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch insert failed, retrying row-by-row: Bulk syntax error')
      );
    });

    it('retries row-by-row on bulk failure, skipping failed inserts and logging errors', async () => {
      mockPool.query = jest
        .fn()
        .mockRejectedValueOnce(new Error('Bulk constraint error')) // bulk fail
        .mockResolvedValueOnce({ rowCount: 1 }) // first row succeeds
        .mockRejectedValueOnce(new Error('Row conflict error')); // second row fails

      const records = [dummyRecord(1), dummyRecord(2)];
      const result = await insertBatch(mockPool as Pool, records, true);

      expect(result).toEqual({
        inserted: 1,
        failed: 1,
        errors: [
          expect.stringContaining('Row insert error') &&
            expect.stringContaining('Row conflict error'),
        ],
      });
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Row insert failed for'));
    });

    it('retries row-by-row on bulk failure without logging when debug is false', async () => {
      mockPool.query = jest
        .fn()
        .mockRejectedValueOnce(new Error('Bulk constraint error')) // bulk fail
        .mockResolvedValueOnce({ rowCount: 1 }) // first row succeeds
        .mockRejectedValueOnce(new Error('Row conflict error')); // second row fails

      const records = [dummyRecord(1), dummyRecord(2)];
      const result = await insertBatch(mockPool as Pool, records, false);

      expect(result.inserted).toBe(1);
      expect(result.failed).toBe(1);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('insertSingleRecord', () => {
    it('calls pool.query with formatted SQL and parameters', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const record = dummyRecord(5);

      const inserted = await insertSingleRecord(mockPool as Pool, record);
      expect(inserted).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.observations'),
        [
          record.device_id,
          record.bssid,
          record.ssid,
          record.radio_type,
          record.radio_frequency,
          record.radio_capabilities,
          record.radio_service,
          record.radio_rcois,
          record.radio_lasttime_ms,
          record.level,
          record.lat,
          record.lon,
          record.altitude,
          record.accuracy,
          record.time,
          record.observed_at_ms,
          record.external,
          record.mfgrid,
          record.source_tag,
          record.source_pk,
          record.time_ms,
        ]
      );
    });

    it('returns 0 if rowCount is undefined', async () => {
      mockPool.query = jest.fn().mockResolvedValue({});
      const record = dummyRecord(5);

      const inserted = await insertSingleRecord(mockPool as Pool, record);
      expect(inserted).toBe(0);
    });
  });
});
