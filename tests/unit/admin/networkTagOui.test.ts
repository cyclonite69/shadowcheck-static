/**
 * Network Tag OUI Unit Tests
 */

jest.mock('../../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: jest.fn(),
  },
  databaseService: {
    query: jest.fn(),
  },
}));

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
const { adminDbService, databaseService } = require('../../../server/src/config/container');

describe('networkTagOui Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTagToNetwork', () => {
    it('should add a tag using app.network_add_tag function', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rowCount: 1 });
      await addTagToNetwork('00:11:22:33:44:55', 'test-tag', 'some notes');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('UPDATE app.network_tags');
      expect(sql).toContain(
        'SET tags = app.network_add_tag(tags, $2), notes = COALESCE($3, notes), updated_at = NOW()'
      );
      expect(sql).toContain('WHERE bssid = $1');
      expect(params).toEqual(['00:11:22:33:44:55', 'test-tag', 'some notes']);
    });
  });

  describe('removeTagFromNetwork', () => {
    it('should remove a tag using app.network_remove_tag function', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rowCount: 1 });
      await removeTagFromNetwork('00:11:22:33:44:55', 'test-tag');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('UPDATE app.network_tags');
      expect(sql).toContain('SET tags = app.network_remove_tag(tags, $2), updated_at = NOW()');
      expect(sql).toContain('WHERE bssid = $1');
      expect(params).toEqual(['00:11:22:33:44:55', 'test-tag']);
    });
  });

  describe('getOUIGroups', () => {
    it('should query oui_device_groups table', async () => {
      databaseService.query.mockResolvedValueOnce({
        rows: [{ oui: '00:11:22', device_count: 5 }],
      });
      const result = await getOUIGroups();
      expect(result).toHaveLength(1);
      expect(result[0].oui).toBe('00:11:22');
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT oui, device_count, collective_threat_score, threat_level, primary_bssid'
      );
      expect(sql).toContain(
        'secondary_bssids, has_randomization, randomization_confidence, last_updated'
      );
      expect(sql).toContain('FROM app.oui_device_groups');
      expect(sql).toContain('WHERE device_count > 1');
      expect(sql).toContain('ORDER BY collective_threat_score DESC');
      expect(params).toEqual([]);
    });
  });

  describe('getOUIGroupDetails', () => {
    it('should fetch group, randomization, and networks', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ oui: '00:11:22' }] }) // group
        .mockResolvedValueOnce({ rows: [{ oui: '00:11:22', status: 'SUSPECT' }] }) // randomization
        .mockResolvedValueOnce({ rows: [{ bssid: '00:11:22:33:44:55' }] }); // networks

      const result = await getOUIGroupDetails('00:11:22');
      expect(result.group.oui).toBe('00:11:22');
      expect(result.randomization.status).toBe('SUSPECT');
      expect(result.networks).toHaveLength(1);
      expect(databaseService.query).toHaveBeenCalledTimes(3);

      const calls = databaseService.query.mock.calls;
      expect(calls[0][0]).toEqual('SELECT * FROM app.oui_device_groups WHERE oui = $1');
      expect(calls[0][1]).toEqual(['00:11:22']);

      expect(calls[1][0]).toEqual('SELECT * FROM app.mac_randomization_suspects WHERE oui = $1');
      expect(calls[1][1]).toEqual(['00:11:22']);

      expect(calls[2][0]).toContain(
        'SELECT n.bssid, nts.final_threat_score, nts.final_threat_level, n.ssid'
      );
      expect(calls[2][0]).toContain('COUNT(obs.id) as observation_count');
      expect(calls[2][0]).toContain('FROM app.networks n');
      expect(calls[2][0]).toContain(
        'LEFT JOIN app.network_threat_scores nts ON n.bssid = nts.bssid'
      );
      expect(calls[2][0]).toContain('LEFT JOIN app.observations obs ON n.bssid = obs.bssid');
      expect(calls[2][0]).toContain('WHERE SUBSTRING(n.bssid, 1, 8) = $1');
      expect(calls[2][0]).toContain(
        'GROUP BY n.bssid, nts.final_threat_score, nts.final_threat_level, n.ssid'
      );
      expect(calls[2][0]).toContain('ORDER BY nts.final_threat_score DESC');
      expect(calls[2][1]).toEqual(['00:11:22']);
    });
  });

  describe('getMACRandomizationSuspects', () => {
    it('should query mac_randomization_suspects table', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ oui: '00:11:22' }] });
      const result = await getMACRandomizationSuspects();
      expect(result).toHaveLength(1);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT oui, status, confidence_score, avg_distance_km, movement_speed_kmh'
      );
      expect(sql).toContain('array_length(mac_sequence, 1) as mac_count, created_at');
      expect(sql).toContain('FROM app.mac_randomization_suspects');
      expect(sql).toContain('ORDER BY confidence_score DESC');
      expect(params).toEqual([]);
    });
  });

  describe('insertNetworkTagWithNotes', () => {
    it('should insert network tag with notes', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rowCount: 1 });
      await insertNetworkTagWithNotes('B1', ['T1'], 'Notes');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO app.network_tags (bssid, tags, notes, created_by)');
      expect(sql).toContain("VALUES ($1, $2::jsonb, $3, 'admin')");
      expect(params).toEqual(['B1', '["T1"]', 'Notes']);
    });
  });

  describe('getNetworkTagsByBssid', () => {
    it('should return tags if found', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ tags: ['T1'] }] });
      const result = await getNetworkTagsByBssid('B1');
      expect(result.tags).toEqual(['T1']);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toEqual('SELECT tags FROM app.network_tags WHERE bssid = $1');
      expect(params).toEqual(['B1']);
    });

    it('should return null if not found', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkTagsByBssid('B1');
      expect(result).toBeNull();
    });
  });

  describe('getNetworkTagsAndNotes', () => {
    it('should return tags and notes if found', async () => {
      databaseService.query.mockResolvedValueOnce({
        rows: [{ bssid: 'B1', tags: ['T1'], notes: 'N' }],
      });
      const result = await getNetworkTagsAndNotes('B1');
      expect(result.bssid).toBe('B1');
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toEqual('SELECT bssid, tags, notes FROM app.network_tags WHERE bssid = $1');
      expect(params).toEqual(['B1']);
    });

    it('should return null if not found', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkTagsAndNotes('B1');
      expect(result).toBeNull();
    });
  });

  describe('getAllNetworkTags', () => {
    it('should fetch all network tags', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await getAllNetworkTags();
      expect(result).toHaveLength(1);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT bssid, tags, notes, created_at, updated_at FROM app.network_tags'
      );
      expect(sql).toContain(
        'WHERE tags IS NOT NULL AND array_length(tags, 1) > 0 ORDER BY updated_at DESC'
      );
      expect(params).toEqual([]);
    });
  });

  describe('searchNetworksByTag', () => {
    it('should search networks by tag', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await searchNetworksByTag('T1');
      expect(result).toHaveLength(1);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT nt.bssid, nt.tags, nt.notes, n.ssid, n.type, n.bestlevel as signal'
      );
      expect(sql).toContain('FROM app.network_tags nt');
      expect(sql).toContain('LEFT JOIN app.networks n ON nt.bssid = n.bssid');
      expect(sql).toContain('WHERE $1 = ANY(nt.tags) ORDER BY nt.updated_at DESC');
      expect(params).toEqual(['T1']);
    });
  });

  describe('getNetworkTagsExpanded', () => {
    it('should fetch from expanded view', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await getNetworkTagsExpanded('B1');
      expect(result.bssid).toBe('B1');
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT bssid, tags, tag_array, is_threat, is_investigate, is_false_positive, is_suspect'
      );
      expect(sql).toContain('notes, created_at, updated_at');
      expect(sql).toContain('FROM app.network_tags_expanded WHERE bssid = $1');
      expect(params).toEqual(['B1']);
    });

    it('should return null if not found', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkTagsExpanded('B1');
      expect(result).toBeNull();
    });
  });

  describe('searchNetworksByTagArray', () => {
    it('should search by tag array with limit', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      const result = await searchNetworksByTagArray(['T1', 'T2'], 10);
      expect(result).toHaveLength(1);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT bssid, tags, tag_array, is_threat, is_investigate, is_false_positive, is_suspect'
      );
      expect(sql).toContain('notes, updated_at');
      expect(sql).toContain('FROM app.network_tags_expanded');
      expect(sql).toContain('WHERE tags ?& $1');
      expect(sql).toContain('ORDER BY updated_at DESC');
      expect(sql).toContain('LIMIT $2');
      expect(params).toEqual([['T1', 'T2'], 10]);
    });
  });
});
