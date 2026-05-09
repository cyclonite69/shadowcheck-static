export {};

const {
  getBackupData,
  exportMLTrainingData,
  getImportCounts: getCountsImportExport,
  truncateAllData,
} = require('../../../../server/src/services/admin/importExportAdminService');

jest.mock('../../../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: jest.fn(),
  },
  databaseService: {
    query: jest.fn(),
  },
}));

const { adminDbService, databaseService } = require('../../../../server/src/config/container');

describe('importExportAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBackupData', () => {
    it('should fetch all related tables', async () => {
      databaseService.query.mockResolvedValue({ rows: [] });
      const result = await getBackupData();
      expect(databaseService.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ networks: [], observations: [], tags: [] });
    });

    it('should propagate database error', async () => {
      databaseService.query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(getBackupData()).rejects.toThrow('DB Error');
    });
  });

  describe('exportMLTrainingData', () => {
    it('should fetch training data', async () => {
      databaseService.query.mockResolvedValue({ rows: [{ bssid: 'AA' }] });
      const result = await exportMLTrainingData();
      expect(result).toEqual([{ bssid: 'AA' }]);
    });

    it('should propagate database error', async () => {
      databaseService.query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(exportMLTrainingData()).rejects.toThrow('DB Error');
    });
  });

  describe('getCountsImportExport', () => {
    it('should return counts from DB', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });
      const result = await getCountsImportExport();
      expect(result).toEqual({ observations: 10, networks: 5 });
    });

    it('should propagate database error', async () => {
      databaseService.query.mockRejectedValueOnce(new Error('DB Error'));
      await expect(getCountsImportExport()).rejects.toThrow('DB Error');
    });
  });

  describe('truncateAllData', () => {
    it('should call TRUNCATE on tables', async () => {
      adminDbService.adminQuery.mockResolvedValue({ rows: [] });
      await truncateAllData();
      expect(adminDbService.adminQuery).toHaveBeenCalledTimes(3);
      expect(adminDbService.adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('TRUNCATE TABLE app.observations'),
        []
      );
    });

    it('should propagate database error', async () => {
      adminDbService.adminQuery.mockRejectedValueOnce(new Error('DB Error'));
      await expect(truncateAllData()).rejects.toThrow('DB Error');
    });
  });
});
