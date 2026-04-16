const { 
  getBackupData, 
  exportMLTrainingData, 
  getImportCounts: getCountsImportExport, 
  truncateAllData 
} = require('../../../../server/src/services/admin/importExportAdminService');

// Mock dependencies
jest.mock('../../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

const { adminQuery: ieAdminQuery } = require('../../../../server/src/services/adminDbService');
const { query: ieDbQuery } = require('../../../../server/src/config/database');

describe('importExportAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBackupData', () => {
    it('should fetch all related tables', async () => {
      ieDbQuery.mockResolvedValue({ rows: [] });
      const result = await getBackupData();
      expect(ieDbQuery).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ networks: [], observations: [], tags: [] });
    });
  });

  describe('exportMLTrainingData', () => {
    it('should fetch training data', async () => {
      ieDbQuery.mockResolvedValue({ rows: [{ bssid: 'AA' }] });
      const result = await exportMLTrainingData();
      expect(result).toEqual([{ bssid: 'AA' }]);
    });
  });

  describe('getCountsImportExport', () => {
    it('should return counts from DB', async () => {
      ieDbQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] })
               .mockResolvedValueOnce({ rows: [{ count: '5' }] });
      const result = await getCountsImportExport();
      expect(result).toEqual({ observations: 10, networks: 5 });
    });
  });

  describe('truncateAllData', () => {
    it('should call TRUNCATE on tables', async () => {
      ieAdminQuery.mockResolvedValue({ rows: [] });
      await truncateAllData();
      expect(ieAdminQuery).toHaveBeenCalledTimes(3);
      expect(ieAdminQuery).toHaveBeenCalledWith(expect.stringContaining('TRUNCATE TABLE app.observations'));
    });
  });
});
