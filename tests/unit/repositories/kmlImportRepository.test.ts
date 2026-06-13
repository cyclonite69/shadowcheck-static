export {};

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../server/src/config/database');
const {
  listKmlImportStatus,
  findKmlFilesByHashes,
} = require('../../../server/src/repositories/kmlImportRepository');

describe('kmlImportRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps import files and aggregate totals from both status queries', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '7',
            source_file: 'capture.kml',
            source_name: undefined,
            source_type: 'wigle',
            file_hash: 'abcdef1234567890',
            hash_prefix: 'abcdef123456',
            placemark_count: null,
            point_count: '42',
            imported_at: new Date('2026-06-13T01:02:03Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            file_count: '2',
            point_count: '42',
            wigle_file_count: null,
            latest_imported_at: '2026-06-13T01:02:03Z',
          },
        ],
      });

    await expect(listKmlImportStatus(25)).resolves.toEqual({
      files: [
        {
          id: 7,
          source_file: 'capture.kml',
          source_name: null,
          source_type: 'wigle',
          file_hash: 'abcdef1234567890',
          hash_prefix: 'abcdef123456',
          placemark_count: 0,
          point_count: 42,
          imported_at: '2026-06-13T01:02:03.000Z',
        },
      ],
      totals: {
        file_count: 2,
        point_count: 42,
        wigle_file_count: 0,
        latest_imported_at: '2026-06-13T01:02:03Z',
      },
    });
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1'), [25]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('MAX(imported_at)'));
  });

  it('returns empty defaults when aggregate rows are absent', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    await expect(listKmlImportStatus('invalid')).resolves.toEqual({
      files: [],
      totals: {
        file_count: 0,
        point_count: 0,
        wigle_file_count: 0,
        latest_imported_at: null,
      },
    });
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1'), [500]);
  });

  it.each([
    [0, 500],
    [-1, 500],
    [5000, 1000],
  ])('normalizes list limit %p to %p', async (input, expected) => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    await listKmlImportStatus(input);

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1'), [expected]);
  });

  it('skips hash queries when no usable hashes remain', async () => {
    await expect(findKmlFilesByHashes(['', '', null as any])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('deduplicates hashes and normalizes matching rows', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '9',
          source_file: 'duplicate.kmz',
          file_hash: 'hash-a',
          imported_at: new Date('2026-06-12T00:00:00Z'),
        },
      ],
    });

    await expect(findKmlFilesByHashes(['hash-a', 'hash-a', 'hash-b'])).resolves.toEqual([
      {
        id: 9,
        source_file: 'duplicate.kmz',
        file_hash: 'hash-a',
        imported_at: '2026-06-12T00:00:00.000Z',
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('file_hash = ANY'), [
      ['hash-a', 'hash-b'],
    ]);
  });
});
