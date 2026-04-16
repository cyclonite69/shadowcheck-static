import {
  acquireGeocodingRunLock,
  completeJobRun,
  createJobRun,
  createRunSnapshot,
  failJobRun,
  getProbeCoordinates,
  loadRecentJobHistory,
  releaseGeocodingRunLock,
  updateJobRunProgress,
} from '../../../../server/src/services/geocoding/jobState';
import { query } from '../../../../server/src/config/database';

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('jobState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRunSnapshot', () => {
    it('should create a snapshot with defaults', () => {
      const options = {
        provider: 'mapbox' as const,
        mode: 'address-only' as const,
        precision: 5,
        limit: 1000,
        perMinute: 200,
      };
      const snapshot = createRunSnapshot('running', options);
      expect(snapshot.status).toBe('running');
      expect(snapshot.provider).toBe('mapbox');
      expect(snapshot.precision).toBe(5);
      expect(snapshot.limit).toBe(1000);
      expect(snapshot.perMinute).toBe(200);
      expect(snapshot.startedAt).toBeDefined();
    });

    it('should override defaults with options', () => {
      const options = {
        provider: 'opencage' as const,
        mode: 'poi-only' as const,
        precision: 6,
        limit: 500,
        perMinute: 100,
        permanent: true,
      };
      const snapshot = createRunSnapshot('completed', options);
      expect(snapshot.provider).toBe('opencage');
      expect(snapshot.precision).toBe(6);
      expect(snapshot.limit).toBe(500);
      expect(snapshot.perMinute).toBe(100);
      expect(snapshot.permanent).toBe(true);
    });

    it('should apply extras', () => {
      const options = {
        provider: 'mapbox' as const,
        mode: 'address-only' as const,
        precision: 5,
        limit: 1000,
        perMinute: 200,
      };
      const extras = { precision: 5, limit: 1000, perMinute: 200 };
      const snapshot = createRunSnapshot('running', options, extras as any);
      expect(snapshot.precision).toBe(5);
      expect(snapshot.limit).toBe(1000);
    });
  });

  describe('loadRecentJobHistory', () => {
    it('should map database rows to snapshots', async () => {
      const mockRows = [
        {
          id: '1',
          status: 'completed',
          provider: 'mapbox',
          mode: 'address-only',
          precision: '5',
          limit_rows: '100',
          per_minute: '60',
          permanent: true,
          processed: '100',
          successful: '95',
          poi_hits: '10',
          rate_limited: '0',
          duration_ms: '5000',
          started_at: new Date('2023-01-01T00:00:00Z'),
          finished_at: new Date('2023-01-01T00:00:05Z'),
        },
      ];
      (query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const history = await loadRecentJobHistory();
      expect(history).toHaveLength(1);
      const item = history[0];
      expect(item.id).toBe(1);
      expect(item.status).toBe('completed');
      expect(item.permanent).toBe(true);
      expect(item.result).toEqual({
        precision: 5,
        mode: 'address-only',
        provider: 'mapbox',
        processed: 100,
        successful: 95,
        poiHits: 10,
        rateLimited: 0,
        durationMs: 5000,
      });
    });
  });

  describe('getProbeCoordinates', () => {
    it('should return coordinates if found', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ lat_round: 1.23, lon_round: 4.56 }] });
      const coords = await getProbeCoordinates(5);
      expect(coords).toEqual({ lat: 1.23, lon: 4.56 });
      expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY COUNT(*) DESC'), [5]);
    });

    it('should return null if not found', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      const coords = await getProbeCoordinates(5);
      expect(coords).toBeNull();
    });
  });

  describe('createJobRun', () => {
    it('should insert and return id', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: '123' }] });
      const options = {
        provider: 'mapbox' as const,
        mode: 'address-only' as const,
        precision: 5,
        limit: 1000,
        perMinute: 200,
      };
      const id = await createJobRun(options);
      expect(id).toBe(123);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO app.geocoding_job_runs'), [
        'mapbox',
        'address-only',
        5,
        1000,
        200,
        false,
      ]);
    });
  });

  describe('completeJobRun', () => {
    it('should update job status and result', async () => {
      const result = {
        processed: 100,
        successful: 90,
        poiHits: 5,
        rateLimited: 1,
        durationMs: 10000,
      };
      await completeJobRun(123, result as any);
      expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'completed'"), [
        123,
        100,
        90,
        5,
        1,
        10000,
      ]);
    });
  });

  describe('updateJobRunProgress', () => {
    it('should update progress if running', async () => {
      const result = {
        processed: 50,
        successful: 45,
        poiHits: 2,
        rateLimited: 0,
      };
      await updateJobRunProgress(123, result, 5000);
      expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'running'"), [
        123,
        50,
        45,
        2,
        0,
        5000,
      ]);
    });
  });

  describe('failJobRun', () => {
    it('should update status to failed', async () => {
      await failJobRun(123, 'some error');
      expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'failed'"), [123, 'some error']);
    });
  });

  describe('locks', () => {
    it('acquireGeocodingRunLock should return true if acquired', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ acquired: true }] });
      const acquired = await acquireGeocodingRunLock();
      expect(acquired).toBe(true);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('pg_try_advisory_lock'), [74100531]);
    });

    it('releaseGeocodingRunLock should call unlock', async () => {
      await releaseGeocodingRunLock();
      expect(query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_unlock'), [74100531]);
    });
  });
});
