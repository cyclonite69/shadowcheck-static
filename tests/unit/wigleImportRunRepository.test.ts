import * as repository from '../../server/src/services/wigleImport/runRepository';

// Mock the database
jest.mock('../../server/src/config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    query: jest.fn(),
    pool: {
      connect: jest.fn(() => Promise.resolve(mockClient)),
    },
  };
});

const { query, pool } = require('../../server/src/config/database');

describe('wigleImportRunRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createImportRun', () => {
    it('should insert a new run and return the result', async () => {
      const mockRun = { id: 1, status: 'running' };
      query.mockResolvedValueOnce({ rows: [mockRun] });

      const result = await repository.createImportRun({ ssid: 'test-ssid' });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['v2', 'test-ssid', null])
      );
      expect(result).toEqual(mockRun);
    });
  });

  describe('findLatestResumableRun', () => {
    it('should find the latest resumable run', async () => {
      const mockRun = { id: 1, status: 'paused' };
      query.mockResolvedValueOnce({ rows: [mockRun] });

      const result = await repository.findLatestResumableRun({ ssid: 'test' }, [
        'paused',
        'failed',
      ]);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), ['paused', 'failed']])
      );
      expect(result).toEqual(mockRun);
    });
  });

  describe('reconcileRunProgress', () => {
    it('should reconcile progress within a transaction', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(mockClient);
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            { pages_fetched: 5, rows_returned: 100, rows_inserted: 80, last_successful_page: 5 },
          ],
        }) // summary
        .mockResolvedValueOnce({ rows: [{ next_cursor: 'cursor123' }] }) // latestCursor
        .mockResolvedValueOnce({ rows: [{ id: 1, pages_fetched: 5 }] }) // update
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repository.reconcileRunProgress(1);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });
  });

  describe('markRunFailure', () => {
    it('should update run status to failed', async () => {
      const mockRun = { id: 1, status: 'failed' };
      query.mockResolvedValueOnce({ rows: [mockRun] });

      const result = await repository.markRunFailure(1, 'error message');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'error message']
      );
      expect(result).toEqual(mockRun);
    });
  });

  describe('markRunControlStatus', () => {
    it('should update run status to paused', async () => {
      const mockRun = { id: 1, status: 'paused' };
      query.mockResolvedValueOnce({ rows: [mockRun] });

      const result = await repository.markRunControlStatus(1, 'paused');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'paused']
      );
      expect(result).toEqual(mockRun);
    });
  });

  describe('resumeRunState', () => {
    it('should resume a run', async () => {
      const mockRun = { id: 1, status: 'running' };
      query.mockResolvedValueOnce({ rows: [mockRun] });

      const result = await repository.resumeRunState(1);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1]
      );
      expect(result).toEqual(mockRun);
    });
  });

  describe('completeRun', () => {
    it('should complete a run', async () => {
      const mockRun = { id: 1, status: 'completed' };
      query.mockResolvedValueOnce({ rows: [mockRun] });

      const result = await repository.completeRun(1, 'finished well');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'finished well']
      );
      expect(result).toEqual(mockRun);
    });
  });
});
