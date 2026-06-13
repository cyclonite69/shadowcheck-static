export {};

import {
  checkDuplicateObservations,
  addNetworkNote,
  getNetworkSummary,
  getBackupData,
  upsertNetworkTag,
  updateNetworkTagIgnore,
  insertNetworkTagIgnore,
  updateNetworkThreatTag,
  insertNetworkThreatTag,
  updateNetworkTagNotes,
  insertNetworkTagNotes,
  deleteNetworkTag,
  requestWigleLookup,
  markNetworkInvestigate,
  fetchNetworksPendingWigleLookup,
  exportMLTrainingSet,
} from '../../../server/src/repositories/adminNetworkTagRepository';

const { query } = require('../../../server/src/config/database');
const { adminQuery } = require('../../../server/src/services/adminDbService');

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

describe('adminNetworkTagRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('checkDuplicateObservations calls query and returns first row or null', async () => {
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ total_observations: 10, unique_networks: 2, bssids: ['AA:BB:CC', 'DD:EE:FF'] }],
    });

    const result = await checkDuplicateObservations('AA:BB:CC', 123456789);
    expect(query).toHaveBeenCalled();
    expect(result.total_observations).toBe(10);

    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const nullResult = await checkDuplicateObservations('AA:BB:CC', 123456789);
    expect(nullResult).toBeNull();
  });

  test('addNetworkNote calls query and returns note_id', async () => {
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ note_id: 42 }],
    });

    const noteId = await addNetworkNote('AA:BB:CC', 'Test note content');
    expect(query).toHaveBeenCalled();
    expect(noteId).toBe(42);
  });

  test('getNetworkSummary returns single row or null', async () => {
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', tags: ['threat'] }],
    });

    const summary = await getNetworkSummary('AA:BB:CC');
    expect(query).toHaveBeenCalled();
    expect(summary.bssid).toBe('AA:BB:CC');

    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const nullSummary = await getNetworkSummary('AA:BB:CC');
    expect(nullSummary).toBeNull();
  });

  test('getBackupData queries observations, networks, and tags and returns aggregate object', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1, ssid: 'obs1' }] })
      .mockResolvedValueOnce({ rows: [{ bssid: 'net1' }] })
      .mockResolvedValueOnce({ rows: [{ bssid: 'tag1' }] });

    const backup = await getBackupData();
    expect(query).toHaveBeenCalledTimes(3);
    expect(backup.observations).toHaveLength(1);
    expect(backup.networks).toHaveLength(1);
    expect(backup.tags).toHaveLength(1);
  });

  test('upsertNetworkTag calls adminQuery and returns row', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', threat_tag: 'THREAT' }],
    });

    const result = await upsertNetworkTag('AA:BB:CC', false, null, 'THREAT', 95, 'Upsert note');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.threat_tag).toBe('THREAT');
  });

  test('updateNetworkTagIgnore calls adminQuery and updates ignore state', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', is_ignored: true }],
    });

    const result = await updateNetworkTagIgnore('AA:BB:CC', true, 'Test reason');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.is_ignored).toBe(true);
  });

  test('insertNetworkTagIgnore inserts ignore row and returns result', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', is_ignored: true }],
    });

    const result = await insertNetworkTagIgnore('AA:BB:CC', true, 'Test reason');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.is_ignored).toBe(true);
  });

  test('updateNetworkThreatTag updates threat tag state', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', threat_tag: 'SUSPECT' }],
    });

    const result = await updateNetworkThreatTag('AA:BB:CC', 'SUSPECT', 80);
    expect(adminQuery).toHaveBeenCalled();
    expect(result.threat_tag).toBe('SUSPECT');
  });

  test('insertNetworkThreatTag inserts threat tag state', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', threat_tag: 'THREAT' }],
    });

    const result = await insertNetworkThreatTag('AA:BB:CC', 'THREAT', 90);
    expect(adminQuery).toHaveBeenCalled();
    expect(result.threat_tag).toBe('THREAT');
  });

  test('updateNetworkTagNotes updates tag notes', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', notes: 'Updated notes' }],
    });

    const result = await updateNetworkTagNotes('AA:BB:CC', 'Updated notes');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.notes).toBe('Updated notes');
  });

  test('insertNetworkTagNotes inserts tag notes', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', notes: 'New notes' }],
    });

    const result = await insertNetworkTagNotes('AA:BB:CC', 'New notes');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.notes).toBe('New notes');
  });

  test('deleteNetworkTag deletes row and returns count', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

    const result = await deleteNetworkTag('AA:BB:CC');
    expect(adminQuery).toHaveBeenCalled();
    expect(result).toBe(1);
  });

  test('requestWigleLookup flags lookup requested', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', wigle_lookup_requested: true }],
    });

    const result = await requestWigleLookup('AA:BB:CC');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.wigle_lookup_requested).toBe(true);
  });

  test('markNetworkInvestigate inserts investigate tag', async () => {
    (adminQuery as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', threat_tag: 'INVESTIGATE' }],
    });

    const result = await markNetworkInvestigate('AA:BB:CC');
    expect(adminQuery).toHaveBeenCalled();
    expect(result.threat_tag).toBe('INVESTIGATE');
  });

  test('fetchNetworksPendingWigleLookup returns rows', async () => {
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC' }, { bssid: 'DD:EE:FF' }],
    });

    const result = await fetchNetworksPendingWigleLookup(5);
    expect(query).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  test('exportMLTrainingSet returns rows', async () => {
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC', threat_tag: 'THREAT', ssid: 'TargetNet' }],
    });

    const result = await exportMLTrainingSet();
    expect(query).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].ssid).toBe('TargetNet');
  });
});
