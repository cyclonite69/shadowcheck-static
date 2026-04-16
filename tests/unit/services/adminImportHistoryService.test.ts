import * as adminImportHistoryService from '../../../server/src/services/adminImportHistoryService';
import { adminQuery } from '../../../server/src/services/adminDbService';
import { query } from '../../../server/src/config/database';
import logger from '../../../server/src/logging/logger';

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/config/database');
jest.mock('../../../server/src/logging/logger');

describe('adminImportHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('captureImportMetrics catches errors for individual metrics', async () => {
    (adminQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));
    const metrics = await adminImportHistoryService.captureImportMetrics();
    expect(metrics.networks).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  test('createImportHistoryEntry returns new ID', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [{ id: 123 }] });
    const id = await adminImportHistoryService.createImportHistoryEntry('tag', 'file.kml', {});
    expect(id).toBe(123);
  });

  test('completeImportSuccess calls correct update query', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rowCount: 1 });
    await adminImportHistoryService.completeImportSuccess(1, 10, 0, '5', {});
    expect(adminQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE app.import_history'), expect.any(Array));
  });

  test('getImportCounts returns correct data', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ observations: 1, networks: 2 }] });
    const counts = await adminImportHistoryService.getImportCounts();
    expect(counts.observations).toBe(1);
    expect(counts.networks).toBe(2);
  });
});
