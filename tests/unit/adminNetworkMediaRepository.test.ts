export {};

jest.mock('../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

const { query } = require('../../server/src/config/database');
const { adminQuery } = require('../../server/src/services/adminDbService');
const repository = require('../../server/src/repositories/adminNetworkMediaRepository');

describe('adminNetworkMediaRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts network media with EXIF and thumbnail fields', async () => {
    const row = { id: 5, filename: 'evidence.jpg' };
    adminQuery.mockResolvedValueOnce({ rows: [row] });
    const media = Buffer.from('full');
    const thumbnail = Buffer.from('thumb');

    await expect(
      repository.insertNetworkMedia(
        'AA:BB:CC:DD:EE:FF',
        'image',
        'evidence.jpg',
        2048,
        'image/jpeg',
        media,
        'front door',
        40.1,
        -75.2,
        '2026-06-13T00:00:00Z',
        thumbnail
      )
    ).resolves.toEqual(row);
    expect(adminQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app.network_media'),
      [
        'AA:BB:CC:DD:EE:FF',
        'image',
        'evidence.jpg',
        2048,
        'image/jpeg',
        media,
        'front door',
        40.1,
        -75.2,
        '2026-06-13T00:00:00Z',
        thumbnail,
      ]
    );
  });

  it('lists network media rows', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    query.mockResolvedValueOnce({ rows });

    await expect(repository.selectNetworkMediaList('AA:BB:CC:DD:EE:FF')).resolves.toEqual(rows);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at DESC'), [
      'AA:BB:CC:DD:EE:FF',
    ]);
  });

  it('selects full media and returns null when it is missing', async () => {
    const row = {
      filename: 'evidence.jpg',
      mime_type: 'image/jpeg',
      media_data: Buffer.from('full'),
      thumbnail: Buffer.from('thumb'),
    };
    query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });

    await expect(repository.selectNetworkMediaFile('42')).resolves.toEqual(row);
    await expect(repository.selectNetworkMediaFile('43')).resolves.toBeNull();
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('media_data, thumbnail'), [
      '42',
    ]);
  });

  it('selects thumbnail-only data and returns null when absent', async () => {
    const row = { mime_type: 'image/jpeg', thumbnail: Buffer.from('thumb') };
    query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });

    await expect(repository.selectNetworkMediaThumbnail('42')).resolves.toEqual(row);
    await expect(repository.selectNetworkMediaThumbnail('43')).resolves.toBeNull();
    expect(query).toHaveBeenNthCalledWith(
      1,
      'SELECT mime_type, thumbnail FROM app.network_media WHERE id = $1',
      ['42']
    );
  });

  it('inserts and selects legacy network notations', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [{ notation: { text: 'seen' } }] });
    query
      .mockResolvedValueOnce({ rows: [{ detailed_notes: [{ text: 'seen' }] }] })
      .mockResolvedValueOnce({ rows: [{ detailed_notes: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      repository.insertNetworkNotation('AA:BB:CC:DD:EE:FF', 'seen', 'investigation')
    ).resolves.toEqual({ text: 'seen' });
    await expect(repository.selectNetworkNotations('AA:BB:CC:DD:EE:FF')).resolves.toEqual([
      { text: 'seen' },
    ]);
    await expect(repository.selectNetworkNotations('AA:BB:CC:DD:EE:00')).resolves.toEqual([]);
    await expect(repository.selectNetworkNotations('AA:BB:CC:DD:EE:01')).resolves.toEqual([]);
  });

  it('upserts a normalized network note and returns its id', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [{ note_id: '17' }] });

    await expect(
      repository.insertNetworkNote('aa:bb:cc:dd:ee:ff', 'content', 'general', 'admin')
    ).resolves.toBe('17');
    expect(adminQuery).toHaveBeenCalledWith(expect.stringContaining('WITH latest AS'), [
      'AA:BB:CC:DD:EE:FF',
      'content',
      'general',
      'admin',
    ]);
  });

  it('selects active notes with attachment aggregates', async () => {
    const rows = [{ id: 17, attachment_count: 2, image_count: 1 }];
    query.mockResolvedValueOnce({ rows });

    await expect(repository.selectNetworkNotes('AA:BB:CC:DD:EE:FF')).resolves.toEqual(rows);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN LATERAL'), [
      'AA:BB:CC:DD:EE:FF',
    ]);
  });

  it('returns BSSID or null when soft deleting a note', async () => {
    adminQuery
      .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(repository.softDeleteNetworkNote('17')).resolves.toBe('AA:BB:CC:DD:EE:FF');
    await expect(repository.softDeleteNetworkNote('18')).resolves.toBeNull();
  });

  it('returns an updated note or null', async () => {
    const row = { id: 17, content: 'updated' };
    adminQuery.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });

    await expect(repository.updateNetworkNoteContent('17', 'updated')).resolves.toEqual(row);
    await expect(repository.updateNetworkNoteContent('18', 'updated')).resolves.toBeNull();
  });

  it('returns an active note by id or null', async () => {
    const row = { id: 17, bssid: 'AA:BB:CC:DD:EE:FF' };
    query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });

    await expect(repository.selectNetworkNoteById('17')).resolves.toEqual(row);
    await expect(repository.selectNetworkNoteById('18')).resolves.toBeNull();
  });

  it('inserts note media with default nullable storage fields', async () => {
    const row = { id: 21, note_id: 17 };
    adminQuery.mockResolvedValueOnce({ rows: [row] });

    await expect(
      repository.insertNoteMedia(
        '17',
        'AA:BB:CC:DD:EE:FF',
        '/api/media/file.jpg',
        'file.jpg',
        128,
        'image'
      )
    ).resolves.toEqual(row);
    expect(adminQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO app.note_media'), [
      '17',
      'AA:BB:CC:DD:EE:FF',
      '/api/media/file.jpg',
      'file.jpg',
      128,
      'image',
      null,
      null,
      'db',
    ]);
  });

  it('selects note media records and lists note attachments', async () => {
    const media = { id: 21, note_id: 17 };
    const list = [media, { id: 22, note_id: 17 }];
    query
      .mockResolvedValueOnce({ rows: [media] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: list });

    await expect(repository.selectNoteMediaById('21')).resolves.toEqual(media);
    await expect(repository.selectNoteMediaById('99')).resolves.toBeNull();
    await expect(repository.selectNoteMediaList('17')).resolves.toEqual(list);
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('ORDER BY created_at DESC'), [
      '17',
    ]);
  });

  it('returns deleted note media metadata or null', async () => {
    const deleted = { id: 21, note_id: 17, file_name: 'file.jpg' };
    adminQuery.mockResolvedValueOnce({ rows: [deleted] }).mockResolvedValueOnce({ rows: [] });

    await expect(repository.deleteNoteMedia('21')).resolves.toEqual(deleted);
    await expect(repository.deleteNoteMedia('99')).resolves.toBeNull();
  });

  describe('selectRelatedNetworkMediaForBssid', () => {
    const BSSID = 'AA:BB:CC:DD:EE:FF';
    const directRow = {
      id: 11,
      requested_bssid: BSSID,
      source_bssid: BSSID,
      observation_id: null,
      media_type: 'image',
      filename: 'photo.jpg',
      mime_type: 'image/jpeg',
      file_size: 1024,
      created_at: new Date('2026-06-12'),
      exif_captured_at: null,
      is_direct: true,
      source_kind: 'direct',
    };

    test('returns direct media when view does not exist (singleton fallback)', async () => {
      // to_regclass returns null → view absent
      query
        .mockResolvedValueOnce({ rows: [{ oid: null }] }) // to_regclass check
        .mockResolvedValueOnce({ rows: [directRow] }); // direct query

      const result = await repository.selectRelatedNetworkMediaForBssid(BSSID);
      expect(result).toEqual([directRow]);
      // First query is the guard; second is the direct-only SELECT
      expect(query).toHaveBeenCalledTimes(2);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("to_regclass('app.v_sibling_group_media')"),
        []
      );
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM app.network_media'), [
        BSSID,
      ]);
    });

    test('returns direct media for singleton BSSID when view exists but has no component rows', async () => {
      // to_regclass returns non-null → view present
      query
        .mockResolvedValueOnce({ rows: [{ oid: 'app.v_sibling_group_media' }] })
        .mockResolvedValueOnce({ rows: [directRow] }); // combined CTE returns direct only

      const result = await repository.selectRelatedNetworkMediaForBssid(BSSID);
      expect(result).toEqual([directRow]);
    });

    test('component media uses record_type = media filter (not notes)', async () => {
      const componentRow = {
        id: 42,
        requested_bssid: BSSID,
        source_bssid: 'BB:CC:DD:EE:FF:00',
        observation_id: 7,
        media_type: 'image',
        filename: 'sibling.jpg',
        mime_type: 'image/jpeg',
        file_size: 2048,
        created_at: new Date('2026-06-11'),
        exif_captured_at: null,
        is_direct: false,
        source_kind: 'component',
      };

      query
        .mockResolvedValueOnce({ rows: [{ oid: 'app.v_sibling_group_media' }] })
        .mockResolvedValueOnce({ rows: [directRow, componentRow] });

      const result = await repository.selectRelatedNetworkMediaForBssid(BSSID);
      expect(result).toHaveLength(2);
      // Verify the query includes record_type = 'media' guard
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("record_type = 'media'"), [
        BSSID,
      ]);
    });

    test('note rows from v_sibling_group_media cannot collide — record_type filter excludes them', async () => {
      // The query filters sgm.record_type = 'media', so a note row with the same id
      // as a media row can never appear in results. We verify this by checking the SQL
      // contains the guard — not by simulating a note row leaking through, which the
      // DB itself would prevent.
      query
        .mockResolvedValueOnce({ rows: [{ oid: 'app.v_sibling_group_media' }] })
        .mockResolvedValueOnce({ rows: [directRow] });

      await repository.selectRelatedNetworkMediaForBssid(BSSID);
      const combinedSql = (query as jest.Mock).mock.calls[1][0] as string;
      expect(combinedSql).toContain("record_type = 'media'");
      // Confirm notes are not referenced in the component CTE
      expect(combinedSql).not.toContain('note_content');
      expect(combinedSql).not.toContain('app.network_notes');
    });

    test('direct rows win deduplication — is_direct DESC ordering', async () => {
      // When the same media id appears in both direct and component CTEs,
      // the ranked CTE keeps the direct row (rn = 1 on is_direct DESC).
      // Mock returns only the direct row (DB already de-duped via ranked CTE).
      query
        .mockResolvedValueOnce({ rows: [{ oid: 'app.v_sibling_group_media' }] })
        .mockResolvedValueOnce({ rows: [directRow] });

      const result = await repository.selectRelatedNetworkMediaForBssid(BSSID);
      expect(result).toHaveLength(1);
      expect(result[0].is_direct).toBe(true);
      expect(result[0].source_kind).toBe('direct');
      // Verify dedup mechanism is in the SQL
      const sql = (query as jest.Mock).mock.calls[1][0] as string;
      expect(sql).toContain('ORDER BY is_direct DESC');
      expect(sql).toContain('PARTITION BY id');
    });

    test('normalises BSSID to uppercase before querying', async () => {
      query.mockResolvedValueOnce({ rows: [{ oid: null }] }).mockResolvedValueOnce({ rows: [] });

      await repository.selectRelatedNetworkMediaForBssid('aa:bb:cc:dd:ee:ff');
      expect(query).toHaveBeenNthCalledWith(2, expect.any(String), ['AA:BB:CC:DD:EE:FF']);
    });
  });
});
