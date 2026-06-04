/**
 * AdminMaintenanceService Unit Tests
 */

import { adminQuery } from '../../../server/src/services/adminDbService';
import { query } from '../../../server/src/config/database';
import {
  getDuplicateObservationStats,
  deleteDuplicateObservations,
  getObservationCount,
  refreshColocationView,
  truncateAllData,
} from '../../../server/src/services/adminMaintenanceService';

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/config/database');

describe('AdminMaintenanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDuplicateObservationStats', () => {
    it('should return duplicate stats', async () => {
      const mockResult = { total: 100, unique_obs: 80 };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockResult] });

      const stats = await getDuplicateObservationStats();

      expect(stats).toEqual(mockResult);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*) as total'));
    });

    it('should return default stats if no rows returned', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const stats = await getDuplicateObservationStats();

      expect(stats).toEqual({ total: 0, unique_obs: 0 });
    });

    it('should propagate database error', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));
      await expect(getDuplicateObservationStats()).rejects.toThrow('DB Error');
    });
  });

  describe('deleteDuplicateObservations', () => {
    it('should return row count after deleting duplicates', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 20 });

      const result = await deleteDuplicateObservations();

      expect(result).toBe(20);
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM app.observations')
      );
    });

    it('should return 0 if rowCount is null', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: null });

      const result = await deleteDuplicateObservations();

      expect(result).toBe(0);
    });

    it('should propagate database error', async () => {
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));
      await expect(deleteDuplicateObservations()).rejects.toThrow('DB Error');
    });
  });

  describe('getObservationCount', () => {
    it('should return total observation count', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ total: '150' }] });

      const count = await getObservationCount();

      expect(count).toBe(150);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*) as total'));
    });

    it('should return 0 if no results returned', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const count = await getObservationCount();

      expect(count).toBe(0);
    });

    it('should propagate database error', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));
      await expect(getObservationCount()).rejects.toThrow('DB Error');
    });
  });

  describe('refreshColocationView', () => {
    it('should skip and resolve without calling database', async () => {
      await refreshColocationView(1600000000000);
      expect(adminQuery).not.toHaveBeenCalled();
    });
  });

  describe('truncateAllData', () => {
    it('should truncate observations and networks tables', async () => {
      await truncateAllData();

      expect(adminQuery).toHaveBeenCalledTimes(2);
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('TRUNCATE TABLE app.observations')
      );
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('TRUNCATE TABLE app.networks')
      );
    });

    it('should propagate database error', async () => {
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));
      await expect(truncateAllData()).rejects.toThrow('DB Error');
    });
  });
});
