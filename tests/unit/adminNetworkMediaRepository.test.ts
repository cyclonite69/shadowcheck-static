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
});
