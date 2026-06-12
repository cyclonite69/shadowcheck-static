export {};

jest.mock('../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

const { query } = require('../../server/src/config/database');
const {
  selectNetworkMediaFile,
} = require('../../server/src/repositories/adminNetworkMediaRepository');

describe('adminNetworkMediaRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects both full media and thumbnail data for inline delivery', async () => {
    const row = {
      filename: 'evidence.jpg',
      mime_type: 'image/jpeg',
      media_data: Buffer.from('full'),
      thumbnail: Buffer.from('thumb'),
    };
    query.mockResolvedValueOnce({ rows: [row] });

    await expect(selectNetworkMediaFile('42')).resolves.toEqual(row);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('media_data, thumbnail'), ['42']);
  });
});
