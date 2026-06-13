export {};

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

const { query } = require('../../../server/src/config/database');
const { adminQuery } = require('../../../server/src/services/adminDbService');
const repository = require('../../../server/src/repositories/adminNetworkTagOuiRepository');

describe('adminNetworkTagOuiRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns OUI group and randomization lists', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ oui: 'AA:BB:CC' }] })
      .mockResolvedValueOnce({ rows: [{ oui: 'DD:EE:FF' }] });

    await expect(repository.getOUIGroups()).resolves.toEqual([{ oui: 'AA:BB:CC' }]);
    await expect(repository.getMACRandomizationSuspects()).resolves.toEqual([{ oui: 'DD:EE:FF' }]);
  });

  it('combines OUI group details from three parameterized queries', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ oui: 'AA:BB:CC' }] })
      .mockResolvedValueOnce({ rows: [{ confidence_score: 90 }] })
      .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC:00:00:01' }] });

    await expect(repository.getOUIGroupDetails('AA:BB:CC')).resolves.toEqual({
      group: { oui: 'AA:BB:CC' },
      randomization: { confidence_score: 90 },
      networks: [{ bssid: 'AA:BB:CC:00:00:01' }],
    });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls.every((call: any[]) => call[1]?.[0] === 'AA:BB:CC')).toBe(true);
  });

  it('inserts and mutates network tags with parameterized admin queries', async () => {
    adminQuery.mockResolvedValue({ rows: [] });

    await repository.insertNetworkTagWithNotes('AA:BB:CC:DD:EE:FF', ['threat', 'mobile'], 'notes');
    await repository.removeTagFromNetwork('AA:BB:CC:DD:EE:FF', 'mobile');
    await repository.addTagToNetwork('AA:BB:CC:DD:EE:FF', 'investigate', null);

    expect(adminQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO app.network_tags'),
      ['AA:BB:CC:DD:EE:FF', '["threat","mobile"]', 'notes']
    );
    expect(adminQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('app.network_remove_tag'),
      ['AA:BB:CC:DD:EE:FF', 'mobile']
    );
    expect(adminQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('app.network_add_tag'), [
      'AA:BB:CC:DD:EE:FF',
      'investigate',
      null,
    ]);
  });

  it.each([
    ['getNetworkTagsByBssid', 'SELECT tags FROM app.network_tags'],
    ['getNetworkTagsAndNotes', 'SELECT bssid, tags, notes FROM app.network_tags'],
    ['getNetworkTagsExpanded', 'FROM app.network_tags_expanded'],
  ])('returns a row or null from %s', async (method, sqlFragment) => {
    query
      .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(repository[method]('AA:BB:CC:DD:EE:FF')).resolves.toEqual({
      bssid: 'AA:BB:CC:DD:EE:FF',
    });
    await expect(repository[method]('AA:BB:CC:DD:EE:00')).resolves.toBeNull();
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining(sqlFragment), [
      'AA:BB:CC:DD:EE:FF',
    ]);
  });

  it('returns tag list and search results', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ bssid: 'A' }] })
      .mockResolvedValueOnce({ rows: [{ bssid: 'B' }] })
      .mockResolvedValueOnce({ rows: [{ bssid: 'C' }] });

    await expect(repository.getAllNetworkTags()).resolves.toEqual([{ bssid: 'A' }]);
    await expect(repository.searchNetworksByTag('threat')).resolves.toEqual([{ bssid: 'B' }]);
    await expect(repository.searchNetworksByTagArray(['threat', 'mobile'], 25)).resolves.toEqual([
      { bssid: 'C' },
    ]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE $1 = ANY(nt.tags)'), [
      'threat',
    ]);
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('WHERE tags ?& $1'), [
      ['threat', 'mobile'],
      25,
    ]);
  });
});
