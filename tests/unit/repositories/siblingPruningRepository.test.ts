import { SiblingPruningRepository } from '../../../server/src/repositories/siblingPruningRepository';

const mockAdminQuery = jest.fn().mockResolvedValue({ rows: [] });

jest.mock('../../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: (...args: any[]) => mockAdminQuery(...args),
  },
}));

describe('SiblingPruningRepository', () => {
  let repository: SiblingPruningRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SiblingPruningRepository();
  });

  describe('checkHardwareOverflow', () => {
    it('should query active_network_explorer_mv for node count >= 17', async () => {
      mockAdminQuery.mockResolvedValue({
        rows: [{ oui: '00:11:22', ssid: 'TestSSID', node_count: 20 }],
      });

      const result = await repository.checkHardwareOverflow();

      expect(mockAdminQuery).toHaveBeenCalled();
      expect(result).toEqual([{ oui: '00:11:22', ssid: 'TestSSID', node_count: 20 }]);
    });

    it('should fallback to empty array if rows are falsy', async () => {
      mockAdminQuery.mockResolvedValue({});

      const result = await repository.checkHardwareOverflow();

      expect(result).toEqual([]);
    });
  });

  describe('pruneHardwareOverflow', () => {
    it('should execute prune query for cross_oui_ssid_exact', async () => {
      mockAdminQuery.mockResolvedValue({ rowCount: 5 });

      await repository.pruneHardwareOverflow();

      expect(mockAdminQuery).toHaveBeenCalled();
    });
  });

  describe('checkSequentialOverflow', () => {
    it('should query sequential rule connected component sizes >= 17', async () => {
      mockAdminQuery.mockResolvedValue({
        rows: [{ component_id: '00:11:22:33:44:55', rule: 'Class A', node_count: 18 }],
      });

      const result = await repository.checkSequentialOverflow();

      expect(mockAdminQuery).toHaveBeenCalled();
      expect(result).toEqual([
        { component_id: '00:11:22:33:44:55', rule: 'Class A', node_count: 18 },
      ]);
    });

    it('should fallback to empty array if rows are falsy', async () => {
      mockAdminQuery.mockResolvedValue({});

      const result = await repository.checkSequentialOverflow();

      expect(result).toEqual([]);
    });
  });

  describe('pruneSequentialOverflow', () => {
    it('should run sequential prune query and return rowCount', async () => {
      mockAdminQuery.mockResolvedValue({ rowCount: 15 });

      const result = await repository.pruneSequentialOverflow();

      expect(mockAdminQuery).toHaveBeenCalled();
      expect(result).toBe(15);
    });

    it('should default to 0 if rowCount is falsy', async () => {
      mockAdminQuery.mockResolvedValue({});

      const result = await repository.pruneSequentialOverflow();

      expect(result).toBe(0);
    });
  });
});
