/**
 * Network Tag Core Unit Tests
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
  addNetworkNote,
  checkDuplicateObservations,
  deleteNetworkTag,
  exportMLTrainingSet,
  getBackupData,
  getNetworkSummary,
  fetchNetworksPendingWigleLookup,
  insertNetworkTagIgnore,
  insertNetworkTagNotes,
  insertNetworkThreatTag,
  markNetworkInvestigate,
  requestWigleLookup,
  updateNetworkTagIgnore,
  updateNetworkTagNotes,
  updateNetworkThreatTag,
  upsertNetworkTag,
} from '../../../server/src/services/admin/networkTagCore';
const { adminDbService, databaseService } = require('../../../server/src/config/container');

describe('networkTagCore Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDuplicateObservations', () => {
    it('should query for duplicate observations', async () => {
      const mockResult = { rows: [{ total_observations: 5 }] };
      databaseService.query.mockResolvedValueOnce(mockResult);
      const result = await checkDuplicateObservations('00:11:22:33:44:55', 1234567890);
      expect(result).toEqual(mockResult.rows[0]);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain('WITH target_obs AS');
      expect(sql).toContain('SELECT time, lat, lon, accuracy');
      expect(sql).toContain('FROM app.observations');
      expect(sql).toContain('WHERE bssid = $1 AND time = $2');
      expect(sql).toContain('SELECT');
      expect(sql).toContain('COUNT(*) as total_observations');
      expect(sql).toContain('COUNT(DISTINCT l.bssid) as unique_networks');
      expect(sql).toContain('ARRAY_AGG(DISTINCT l.bssid ORDER BY l.bssid) as bssids');
      expect(sql).toContain('FROM app.observations l');
      expect(sql).toContain('l.time = t.time');
      expect(sql).toContain('AND l.lat = t.lat');
      expect(sql).toContain('AND l.lon = t.lon');
      expect(sql).toContain('AND l.accuracy = t.accuracy');
      expect(sql).toContain('GROUP BY t.lat, t.lon, t.accuracy, t.time');
      expect(params).toEqual(['00:11:22:33:44:55', 1234567890]);
    });

    it('should return null if no observations found', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [] });
      const result = await checkDuplicateObservations('00:11:22:33:44:55', 1234567890);
      expect(result).toBeNull();
    });
  });

  describe('addNetworkNote', () => {
    it('should add a note and return its id', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [{ note_id: 123 }] });
      const result = await addNetworkNote('00:11:22:33:44:55', 'test note');
      expect(result).toBe(123);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toEqual("SELECT app.network_add_note($1, $2, 'general', 'user') as note_id");
      expect(params).toEqual(['00:11:22:33:44:55', 'test note']);
    });
  });

  describe('getNetworkSummary', () => {
    it('should return network summary if found', async () => {
      const mockSummary = { bssid: '00:11:22:33:44:55', tags: [] };
      databaseService.query.mockResolvedValueOnce({ rows: [mockSummary] });
      const result = await getNetworkSummary('00:11:22:33:44:55');
      expect(result).toEqual(mockSummary);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain(
        'SELECT bssid, tags, tag_array, is_threat, is_investigate, is_false_positive, is_suspect'
      );
      expect(sql).toContain('FROM app.network_tags_full');
      expect(sql).toContain('WHERE bssid = $1');
      expect(params).toEqual(['00:11:22:33:44:55']);
    });

    it('should return null if not found', async () => {
      databaseService.query.mockResolvedValueOnce({ rows: [] });
      const result = await getNetworkSummary('00:11:22:33:44:55');
      expect(result).toBeNull();
    });
  });

  describe('getBackupData', () => {
    it('should fetch observations, networks, and tags', async () => {
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // observations
        .mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] }) // networks
        .mockResolvedValueOnce({ rows: [{ bssid: 'B1', tag: 'T1' }] }); // tags

      const result = await getBackupData();
      expect(result.observations).toHaveLength(1);
      expect(result.networks).toHaveLength(1);
      expect(result.tags).toHaveLength(1);
      expect(databaseService.query).toHaveBeenCalledTimes(3);

      const calls = databaseService.query.mock.calls;
      expect(calls[0][0]).toEqual('SELECT * FROM app.observations ORDER BY observed_at DESC');
      expect(calls[1][0]).toEqual('SELECT * FROM app.networks');
      expect(calls[2][0]).toEqual('SELECT * FROM app.network_tags');
    });
  });

  describe('upsertNetworkTag', () => {
    it('should call adminQuery with correct SQL and parameters', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: '00:11:22:33:44:55' }] });
      await upsertNetworkTag('00:11:22:33:44:55', true, 'test', 'THREAT', 0.9, 'notes');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO app.network_tags');
      expect(sql).toContain(
        'bssid, is_ignored, ignore_reason, threat_tag, threat_confidence, notes'
      );
      expect(sql).toContain('ON CONFLICT (bssid) DO UPDATE SET');
      expect(sql).toContain('is_ignored = COALESCE($2, app.network_tags.is_ignored)');
      expect(sql).toContain(
        'ignore_reason = CASE WHEN $2 IS NOT NULL THEN $3 ELSE app.network_tags.ignore_reason END'
      );
      expect(sql).toContain('threat_tag = COALESCE($4, app.network_tags.threat_tag)');
      expect(sql).toContain(
        'threat_confidence = CASE WHEN $4 IS NOT NULL THEN $5 ELSE app.network_tags.threat_confidence END'
      );
      expect(sql).toContain('notes = COALESCE($6, app.network_tags.notes)');
      expect(sql).toContain('RETURNING *');
      expect(params).toEqual(['00:11:22:33:44:55', true, 'test', 'THREAT', 0.9, 'notes']);
    });
  });

  describe('updateNetworkTagIgnore', () => {
    it('should update ignore status', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await updateNetworkTagIgnore('B1', true, 'Reason');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('UPDATE app.network_tags');
      expect(sql).toContain('SET is_ignored = $1, ignore_reason = $2, updated_at = NOW()');
      expect(sql).toContain('WHERE bssid = $3 RETURNING *');
      expect(params).toEqual([true, 'Reason', 'B1']);
    });
  });

  describe('insertNetworkTagIgnore', () => {
    it('should insert ignore status', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await insertNetworkTagIgnore('B1', true, 'Reason');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO app.network_tags (bssid, is_ignored, ignore_reason)');
      expect(sql).toContain('VALUES ($1, $2, $3) RETURNING *');
      expect(params).toEqual(['B1', true, 'Reason']);
    });
  });

  describe('updateNetworkThreatTag', () => {
    it('should update threat tag', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await updateNetworkThreatTag('B1', 'THREAT', 0.8);
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('UPDATE app.network_tags');
      expect(sql).toContain('SET threat_tag = $1, threat_confidence = $2, updated_at = NOW()');
      expect(sql).toContain('WHERE bssid = $3 RETURNING *');
      expect(params).toEqual(['THREAT', 0.8, 'B1']);
    });
  });

  describe('insertNetworkThreatTag', () => {
    it('should insert threat tag', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await insertNetworkThreatTag('B1', 'THREAT', 0.8);
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO app.network_tags (bssid, threat_tag, threat_confidence)');
      expect(sql).toContain('VALUES ($1, $2, $3) RETURNING *');
      expect(params).toEqual(['B1', 'THREAT', 0.8]);
    });
  });

  describe('updateNetworkTagNotes', () => {
    it('should update notes', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await updateNetworkTagNotes('B1', 'New notes');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('UPDATE app.network_tags');
      expect(sql).toContain('SET notes = $1, updated_at = NOW()');
      expect(sql).toContain('WHERE bssid = $2 RETURNING *');
      expect(params).toEqual(['New notes', 'B1']);
    });
  });

  describe('insertNetworkTagNotes', () => {
    it('should insert notes', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await insertNetworkTagNotes('B1', 'New notes');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO app.network_tags (bssid, notes)');
      expect(sql).toContain('VALUES ($1, $2) RETURNING *');
      expect(params).toEqual(['B1', 'New notes']);
    });
  });

  describe('deleteNetworkTag', () => {
    it('should return rowCount from adminQuery', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await deleteNetworkTag('00:11:22:33:44:55');
      expect(result).toBe(1);
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toEqual('DELETE FROM app.network_tags WHERE bssid = $1');
      expect(params).toEqual(['00:11:22:33:44:55']);
    });

    it('should return 0 if rowCount is missing', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rowCount: null });
      const result = await deleteNetworkTag('00:11:22:33:44:55');
      expect(result).toBe(0);
    });
  });

  describe('requestWigleLookup', () => {
    it('should mark wigle_lookup_requested as true', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await requestWigleLookup('B1');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('UPDATE app.network_tags');
      expect(sql).toContain('SET wigle_lookup_requested = true, updated_at = NOW()');
      expect(sql).toContain('WHERE bssid = $1 RETURNING *');
      expect(params).toEqual(['B1']);
    });
  });

  describe('markNetworkInvestigate', () => {
    it('should upsert investigate tag', async () => {
      adminDbService.adminQuery.mockResolvedValueOnce({ rows: [{ bssid: 'B1' }] });
      await markNetworkInvestigate('B1');
      expect(adminDbService.adminQuery).toHaveBeenCalled();
      const [sql, params] = adminDbService.adminQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO app.network_tags');
      expect(sql).toContain('(bssid, threat_tag, tags, wigle_lookup_requested, updated_at)');
      expect(sql).toContain("VALUES ($1, 'INVESTIGATE', '[\"investigate\"]'::jsonb, TRUE, NOW())");
      expect(sql).toContain('ON CONFLICT (bssid) DO UPDATE SET');
      expect(sql).toContain(
        "WHEN app.network_tags.threat_tag IN ('THREAT', 'SUSPECT', 'FALSE_POSITIVE')"
      );
      expect(sql).toContain('tags = CASE');
      expect(sql).toContain(
        "WHEN COALESCE(app.network_tags.tags, '[]'::jsonb) @> '[\"investigate\"]'::jsonb"
      );
      expect(sql).toContain(
        "ELSE COALESCE(app.network_tags.tags, '[]'::jsonb) || '[\"investigate\"]'::jsonb"
      );
      expect(sql).toContain('RETURNING *');
      expect(params).toEqual(['B1']);
    });
  });

  describe('fetchNetworksPendingWigleLookup', () => {
    it('should fetch networks pending lookup', async () => {
      const mockRows = [{ bssid: 'B1' }];
      databaseService.query.mockResolvedValueOnce({ rows: mockRows });
      const result = await fetchNetworksPendingWigleLookup(10);
      expect(result).toEqual(mockRows);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain('SELECT bssid FROM app.network_tags');
      expect(sql).toContain('WHERE wigle_lookup_requested = true AND wigle_result IS NULL');
      expect(sql).toContain('ORDER BY updated_at ASC LIMIT $1');
      expect(params).toEqual([10]);
    });
  });

  describe('exportMLTrainingSet', () => {
    it('should query for ML training set', async () => {
      const mockRows = [{ bssid: 'B1', threat_tag: 'THREAT' }];
      databaseService.query.mockResolvedValueOnce({ rows: mockRows });
      const result = await exportMLTrainingSet();
      expect(result).toEqual(mockRows);
      expect(databaseService.query).toHaveBeenCalled();
      const [sql, params] = databaseService.query.mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(sql).toContain(
        'nt.bssid, nt.threat_tag, nt.threat_confidence, nt.is_ignored, nt.tag_history'
      );
      expect(sql).toContain(
        'n.ssid, n.type as network_type, n.frequency, n.capabilities, n.bestlevel as signal_dbm'
      );
      expect(sql).toContain('COUNT(o.id) as observation_count');
      expect(sql).toContain('COUNT(DISTINCT DATE(o.observed_at)) as unique_days');
      expect(sql).toContain('ST_Distance(');
      expect(sql).toContain('ST_MakePoint(MIN(o.lon), MIN(o.lat))::geography');
      expect(sql).toContain('ST_MakePoint(MAX(o.lon), MAX(o.lat))::geography');
      expect(sql).toContain('/ 1000.0 as distance_range_km');
      expect(sql).toContain('FROM app.network_tags nt');
      expect(sql).toContain('LEFT JOIN app.networks n ON nt.bssid = n.bssid');
      expect(sql).toContain('LEFT JOIN app.observations o ON nt.bssid = o.bssid');
      expect(sql).toContain('WHERE nt.threat_tag IS NOT NULL');
      expect(sql).toContain(
        'GROUP BY nt.bssid, nt.threat_tag, nt.threat_confidence, nt.is_ignored'
      );
      expect(sql).toContain('ORDER BY nt.updated_at DESC');
      expect(params).toEqual([]);
    });
  });
});
