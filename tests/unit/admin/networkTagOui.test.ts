/**
 * Network Tag OUI Unit Tests
 */

import {
  addTagToNetwork,
  getAllNetworkTags,
  getMACRandomizationSuspects,
  getNetworkTagsAndNotes,
  getNetworkTagsByBssid,
  getNetworkTagsExpanded,
  getOUIGroupDetails,
  getOUIGroups,
  insertNetworkTagWithNotes,
  removeTagFromNetwork,
  searchNetworksByTag,
  searchNetworksByTagArray,
} from '../../../server/src/services/admin/networkTagOui';
import { adminQuery } from '../../../server/src/services/adminDbService';
import { query } from '../../../server/src/config/database';

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/config/database');

describe('networkTagOui Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTagToNetwork', () => {
    it('should add a tag using app.network_add_tag function', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      await addTagToNetwork('00:11:22:33:44:55', 'test-tag', 'some notes');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('app.network_add_tag(tags, $2)'),
        ['00:11:22:33:44:55', 'test-tag', 'some notes']
      );
    });
  });

  describe('removeTagFromNetwork', () => {
    it('should remove a tag using app.network_remove_tag function', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      await removeTagFromNetwork('00:11:22:33:44:55', 'test-tag');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('app.network_remove_tag(tags, $2)'),
        ['00:11:22:33:44:55', 'test-tag']
      );
    });
  });

  describe('getOUIGroups', () => {
    it('should query oui_device_groups table', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ oui: '00:11:22', device_count: 5 }],
      });
      const result = await getOUIGroups();
      expect(result).toHaveLength(1);
      expect(result[0].oui).toBe('00:11:22');
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM app.oui_device_groups'));
    });
  });

  describe('getOUIGroupDetails', () => {
    it('should fetch group, randomization, and networks', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ oui: '00:11:22' }] }) // group
        .mockResolvedValueOnce({ rows: [{ oui: '00:11:22', status: 'SUSPECT' }] }) // randomization
        .mockResolvedValueOnce({ rows: [{ bssid: '00:11:22:33:44:55' }] }); // networks

      const result = await getOUIGroupDetails('00:11:22');
      expect(result.group.oui).toBe('00:11:22');
      expect(result.randomization.status).toBe('SUSPECT');
      expect(result.networks).toHaveLength(1);
      expect(query).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMACRandomizationSuspects', () => {
    it('should query mac_randomization_suspects table', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ oui: '00:11:22' }] });
      const result = await getMACRandomizationSuspects();
      expect(result).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM app.mac_randomization_suspects'));
    });
  });

  describe('insertNetworkTagWithNotes', () => {
    it('should insert network tag with notes', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      await insertNetworkTagWithNotes('B1', ['T1'], 'Notes');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.network_tags'),
        ['B1', '["T1"]', 'Notes']
      );
    });
  });

  describe('getNetworkTagsByBssid', () => {
    it('should return tags if found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ tags: ['T1'] }] });
      const result = await getNetworkTagsByBssid('B1');
      expect(result.tags).toEqual(['T1']);
    });

    it('should return null if not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkTagsByBssid('B1');
      expect(result).toBeNull();
    });
  });

  describe('getNetworkTagsAndNotes', () => {
    it('should return tags and notes if found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: 'B1', tags: ['T1'], notes: 'N' }] });
      const result = await getNetworkTagsAndNotes('B1');
      expect(result.bssid).toBe('B1');
    });

    it('should return null if not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkTagsAndNotes('B1');
      expect(result).toBeNull();
    });
  });

  describe('getAllNetworkTags', () => {
    it('should fetch all network tags', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await getAllNetworkTags();
      expect(result).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM app.network_tags'));
    });
  });

  describe('searchNetworksByTag', () => {
    it('should search networks by tag', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await searchNetworksByTag('T1');
      expect(result).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('$1 = ANY(nt.tags)'), ['T1']);
    });
  });

  describe('getNetworkTagsExpanded', () => {
    it('should fetch from expanded view', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await getNetworkTagsExpanded('B1');
      expect(result.bssid).toBe('B1');
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM app.network_tags_expanded'), ['B1']);
    });

    it('should return null if not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkTagsExpanded('B1');
      expect(result).toBeNull();
    });
  });

  describe('searchNetworksByTagArray', () => {
    it('should search by tag array with limit', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await searchNetworksByTagArray(['T1', 'T2'], 10);
      expect(result).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('tags ?& $1'), [['T1', 'T2'], 10]);
    });
  });
});
