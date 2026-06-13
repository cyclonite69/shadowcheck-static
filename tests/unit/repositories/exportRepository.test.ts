export {};

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

const db = require('../../../server/src/config/database');
const { adminQuery } = require('../../../server/src/services/adminDbService');
const repository = require('../../../server/src/repositories/exportRepository');

describe('exportRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['queryObservationsForCSV', 'LIMIT 50000'],
    ['queryObservationsForJSON', 'LIMIT 20000'],
    ['queryNetworksForJSON', 'LIMIT 10000'],
    ['queryObservationsForGeoJSON', 'lat IS NOT NULL'],
  ])('returns rows from %s', async (method, sqlFragment) => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await expect(repository[method]()).resolves.toEqual([{ id: 1 }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining(sqlFragment));
  });

  it('returns sorted app table names', async () => {
    adminQuery.mockResolvedValueOnce({
      rows: [{ tablename: 'networks' }, { tablename: 42 }],
    });

    await expect(repository.queryAppTableNames()).resolves.toEqual(['networks', '42']);
    expect(adminQuery).toHaveBeenCalledWith(expect.stringContaining("schemaname = 'app'"));
  });

  it('quotes table identifiers for row counts', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [{ count: '17' }] });

    await expect(repository.queryTableRowCount('odd"name')).resolves.toBe(17);
    expect(adminQuery).toHaveBeenCalledWith(
      'SELECT COUNT(*)::bigint AS count FROM "app"."odd""name"'
    );
  });

  it('returns zero for missing count rows', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [] });

    await expect(repository.queryTableRowCount('networks')).resolves.toBe(0);
  });

  it('short-circuits non-positive table limits', async () => {
    await expect(repository.queryTableRows('networks', 0)).resolves.toEqual([]);
    await expect(repository.queryTableRows('networks', -1)).resolves.toEqual([]);
    expect(adminQuery).not.toHaveBeenCalled();
  });

  it('quotes table names and normalizes missing rows for table exports', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: null });

    await expect(repository.queryTableRows('network"tags', 25)).resolves.toEqual([{ id: 1 }]);
    await expect(repository.queryTableRows('networks', 5)).resolves.toEqual([]);
    expect(adminQuery).toHaveBeenNthCalledWith(1, 'SELECT * FROM "app"."network""tags" LIMIT 25');
  });

  it('parameterizes KML BSSID selection', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ bssid: 'A' }] });

    await expect(repository.queryObservationsForKML(['A', 'B'])).resolves.toEqual([{ bssid: 'A' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE bssid IN ($1,$2)'), [
      'A',
      'B',
    ]);
  });
});
