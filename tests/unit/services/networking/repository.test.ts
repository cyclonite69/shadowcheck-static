/**
 * Networking Repository Unit Tests
 */

describe('Networking Repository Service', () => {
  let networkingRepository: any;
  let query: jest.Mock;
  let buildNetworkCountQuery: jest.Mock;
  let buildNetworkDataQuery: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    query = jest.fn();
    buildNetworkCountQuery = jest.fn(() => 'SELECT COUNT(*) FROM table');
    buildNetworkDataQuery = jest.fn(() => 'SELECT * FROM table');

    jest.doMock('../../../../server/src/config/database', () => ({
      query,
    }));

    jest.doMock('../../../../server/src/services/networking/sql', () => ({
      buildNetworkCountQuery,
      buildNetworkDataQuery,
    }));

    networkingRepository = require('../../../../server/src/services/networking/repository');
  });

  describe('getNetworkCount()', () => {
    it('should return network count', async () => {
      query.mockResolvedValueOnce({ rows: [{ total: '42' }] });

      const result = await networkingRepository.getNetworkCount([], [], []);

      expect(result).toBe(42);
      expect(buildNetworkCountQuery).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith('SELECT COUNT(*) FROM table', []);
    });

    it('should return 0 if no results', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const result = await networkingRepository.getNetworkCount([], [], []);
      expect(result).toBe(0);
    });
  });

  describe('listNetworks()', () => {
    it("should list networks and transform type '?' to null", async () => {
      const mockRows = [
        { bssid: 'AA:BB', type: 'W' },
        { bssid: 'CC:DD', type: '?' },
      ];
      query.mockResolvedValueOnce({ rows: mockRows });

      const result = await networkingRepository.listNetworks(
        ['col1'],
        ['join1'],
        ['cond1'],
        ['param1'],
        'sort1',
        10,
        0,
        2
      );

      expect(result).toEqual([
        { bssid: 'AA:BB', type: 'W' },
        { bssid: 'CC:DD', type: null },
      ]);
      expect(buildNetworkDataQuery).toHaveBeenCalledWith(
        ['col1'],
        ['join1'],
        ['cond1'],
        'sort1',
        2
      );
      expect(query).toHaveBeenCalledWith('SELECT * FROM table', ['param1', 10, 0]);
    });
  });

  describe('explainQuery()', () => {
    it('should return explained query', async () => {
      const mockExplanation = [{ 'QUERY PLAN': [] }];
      query.mockResolvedValueOnce({ rows: mockExplanation });

      const result = await networkingRepository.explainQuery(
        ['col1'],
        ['join1'],
        ['cond1'],
        ['param1'],
        'sort1',
        10,
        0,
        2
      );

      expect(result).toEqual(mockExplanation);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('EXPLAIN (FORMAT JSON)'),
        expect.any(Array)
      );
    });
  });

  describe('searchNetworksBySSID()', () => {
    it('should search networks without pagination', async () => {
      const mockRows = [{ bssid: 'AA:BB', ssid: 'test' }];
      query.mockResolvedValueOnce({ rows: mockRows }); // for data
      query.mockResolvedValueOnce({ rows: [{ total: '1' }] }); // for count

      const result = await networkingRepository.searchNetworksBySSID('test');

      expect(result).toEqual(mockRows);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE ssid ILIKE $1'), ['test']);
    });

    it('should search networks with pagination', async () => {
      const mockRows = [{ bssid: 'AA:BB', ssid: 'test' }];
      query.mockResolvedValueOnce({ rows: mockRows }); // for data
      query.mockResolvedValueOnce({ rows: [{ total: '1' }] }); // for count

      const result = await networkingRepository.searchNetworksBySSID('test', 10, 0);

      expect(result).toEqual({ rows: mockRows, total: 1 });
      expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2 OFFSET $3'), [
        'test',
        10,
        0,
      ]);
    });
  });

  describe('getManufacturerByBSSID()', () => {
    it('should return manufacturer info', async () => {
      const mockManufacturer = { prefix: 'AABBCC', manufacturer: 'Test Corp' };
      query.mockResolvedValueOnce({ rows: [mockManufacturer] });

      const result = await networkingRepository.getManufacturerByBSSID('AABBCC');

      expect(result).toEqual(mockManufacturer);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('radio_manufacturers'), [
        'AABBCC',
      ]);
    });

    it('should return null if not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const result = await networkingRepository.getManufacturerByBSSID('UNKNOWN');
      expect(result).toBeNull();
    });
  });
});
