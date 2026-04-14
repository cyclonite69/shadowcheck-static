export {};

const BaseRepository = require('../../../server/src/repositories/baseRepository');
const { query } = require('../../../server/src/config/database');

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('BaseRepository', () => {
  class TestRepo extends BaseRepository {
    static ALLOWED_COLUMNS = new Set(['name', 'value']);
    constructor() {
      super('app.networks');
    }
  }

  let repo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepo();
  });

  test('findOne returns a single row', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });
    const result = await repo.findOne('id = $1', [1]);
    expect(result).toEqual({ id: 1 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM app.networks WHERE id = $1 LIMIT 1'),
      [1]
    );
  });

  test('findMany returns multiple rows', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });
    const result = await repo.findMany('id > $1', [0], { orderBy: 'id DESC' });
    expect(result).toHaveLength(2);
    expect(query).toHaveBeenCalled();
  });

  test('count returns a number', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ count: '5' }] });
    const result = await repo.count();
    expect(result).toBe(5);
  });

  test('insert filters columns correctly', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 1, name: 'test', value: 10 }] });
    const result = await repo.insert({ name: 'test', value: 10, invalid: 'data' });
    expect(result.name).toBe('test');
    expect(result.value).toBe(10);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO app.networks'), [
      'test',
      10,
    ]);
  });

  test('update filters columns and executes', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 1, name: 'updated' }] });
    await repo.update({ name: 'updated', invalid: 'data' }, 'id = $1', [1]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SET name = $1'), ['updated', 1]);
  });

  test('delete removes rows', async () => {
    (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
    const result = await repo.delete('id = $1', [1]);
    expect(result).toBe(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM app.networks'), [1]);
  });
});
