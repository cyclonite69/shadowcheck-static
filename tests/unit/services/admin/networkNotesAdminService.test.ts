const { 
  addNetworkNote, 
  getNetworkNotes, 
  deleteNetworkNote, 
  uploadNetworkMedia, 
  getNetworkMediaList, 
  getNetworkMediaFile, 
  addNetworkNotation, 
  getNetworkNotations 
} = require('../../../../server/src/services/admin/networkNotesAdminService');

// Mock dependencies
jest.mock('../../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

const { adminQuery: nnAdminQuery } = require('../../../../server/src/services/adminDbService');
const { query: nnDbQuery } = require('../../../../server/src/config/database');

describe('networkNotesAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addNetworkNote', () => {
    it('should insert a note and return the id', async () => {
      nnAdminQuery.mockResolvedValue({ rows: [{ id: 123 }] });
      const id = await addNetworkNote('AA:BB', 'content');
      expect(id).toBe(123);
      expect(nnAdminQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO app.network_notes'), ['AA:BB', 'content']);
    });
  });

  describe('getNetworkNotes', () => {
    it('should return notes for a BSSID', async () => {
      const mockNotes = [{ id: 1, content: 'test' }];
      nnDbQuery.mockResolvedValue({ rows: mockNotes });
      const result = await getNetworkNotes('AA:BB');
      expect(result).toEqual(mockNotes);
    });
  });

  describe('deleteNetworkNote', () => {
    it('should delete a note and return the bssid', async () => {
      nnAdminQuery.mockResolvedValue({ rows: [{ bssid: 'AA:BB' }] });
      const bssid = await deleteNetworkNote('note-1');
      expect(bssid).toBe('AA:BB');
    });
  });

  describe('uploadNetworkMedia', () => {
    it('should insert media and return the new row', async () => {
      const mockMedia = { id: 1, filename: 'test.jpg' };
      nnAdminQuery.mockResolvedValue({ rows: [mockMedia] });
      const result = await uploadNetworkMedia('AA:BB', 'test.jpg', 'image/jpeg', Buffer.from('data'));
      expect(result).toEqual(mockMedia);
    });
  });

  describe('getNetworkMediaList', () => {
    it('should return media list for a BSSID', async () => {
      const mockList = [{ id: 1 }];
      nnDbQuery.mockResolvedValue({ rows: mockList });
      const result = await getNetworkMediaList('AA:BB');
      expect(result).toEqual(mockList);
    });
  });

  describe('getNetworkMediaFile', () => {
    it('should return a single media file', async () => {
      const mockFile = { id: 1, data: 'binary' };
      nnDbQuery.mockResolvedValue({ rows: [mockFile] });
      const result = await getNetworkMediaFile('1');
      expect(result).toEqual(mockFile);
    });

    it('should return null if not found', async () => {
      nnDbQuery.mockResolvedValue({ rows: [] });
      const result = await getNetworkMediaFile('999');
      expect(result).toBeNull();
    });
  });

  describe('addNetworkNotation', () => {
    it('should insert a notation and return the row', async () => {
      const mockRow = { id: 1, text: 'test' };
      nnAdminQuery.mockResolvedValue({ rows: [mockRow] });
      const result = await addNetworkNotation('AA:BB', 'test', 'GENERAL');
      expect(result).toEqual(mockRow);
    });
  });

  describe('getNetworkNotations', () => {
    it('should return notations list', async () => {
      const mockList = [{ id: 1 }];
      nnDbQuery.mockResolvedValue({ rows: mockList });
      const result = await getNetworkNotations('AA:BB');
      expect(result).toEqual(mockList);
    });
  });
});
