/**
 * Unit tests for Export Service
 */

const {
  generateKML,
  getObservationsForCSV,
  getObservationsForGeoJSON,
  getObservationsAndNetworksForJSON,
  getObservationsForKML,
  getFullDatabaseSnapshot,
} = require('../../server/src/services/exportService');
const exportRepository = require('../../server/src/repositories/exportRepository');

// Mock repository
jest.mock('../../server/src/repositories/exportRepository', () => ({
  queryObservationsForCSV: jest.fn(),
  queryObservationsForJSON: jest.fn(),
  queryNetworksForJSON: jest.fn(),
  queryObservationsForGeoJSON: jest.fn(),
  queryAppTableNames: jest.fn(),
  queryTableRowCount: jest.fn(),
  queryTableRows: jest.fn(),
  queryObservationsForKML: jest.fn(),
}));

describe('Export Service', () => {
  describe('generateKML', () => {
    it('should generate valid KML for empty observations', () => {
      const kml = generateKML([]);
      expect(kml).toContain('<?xml version="1.0"');
      expect(kml).toContain('<kml');
      expect(kml).toContain('No Data');
    });

    it('should generate valid KML structure', () => {
      const observations = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'TestNetwork',
          lat: 40.7128,
          lon: -74.006,
          signal_dbm: -50,
          observed_at: '2024-01-01T12:00:00Z',
          radio_type: 'WiFi',
          frequency: 2400,
          capabilities: 'WPA2',
          accuracy: 10,
          altitude: 100,
        },
      ];

      const kml = generateKML(observations);

      expect(kml).toContain('<?xml version="1.0"');
      expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
      expect(kml).toContain('<Document>');
      expect(kml).toContain('<Folder>');
      expect(kml).toContain('<Placemark>');
      expect(kml).toContain('TestNetwork');
      expect(kml).toContain('AA:BB:CC:DD:EE:FF');
      expect(kml).toContain('-74.006,40.7128,100');
      expect(kml).toContain('</kml>');
    });

    it('should group multiple observations by BSSID', () => {
      const observations = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Network1',
          lat: 40.7128,
          lon: -74.006,
          signal_dbm: -50,
          observed_at: '2024-01-01T12:00:00Z',
          radio_type: 'WiFi',
          frequency: 2400,
          capabilities: 'WPA2',
          accuracy: 10,
          altitude: 100,
        },
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Network1',
          lat: 40.72,
          lon: -74.01,
          signal_dbm: -55,
          observed_at: '2024-01-01T13:00:00Z',
          radio_type: 'WiFi',
          frequency: 2400,
          capabilities: 'WPA2',
          accuracy: 8,
          altitude: 110,
        },
      ];

      const kml = generateKML(observations);
      const folderCount = (kml.match(/<Folder>/g) || []).length;
      expect(folderCount).toBe(1);
      const placemarksCount = (kml.match(/<Placemark>/g) || []).length;
      expect(placemarksCount).toBe(2);
      expect(kml).toContain('Observations: 2');
    });
  });

  describe('getObservationsForCSV', () => {
    it('should call queryObservationsForCSV', async () => {
      exportRepository.queryObservationsForCSV.mockResolvedValueOnce([]);
      await getObservationsForCSV();
      expect(exportRepository.queryObservationsForCSV).toHaveBeenCalled();
    });
  });

  describe('getObservationsForGeoJSON', () => {
    it('should call queryObservationsForGeoJSON', async () => {
      exportRepository.queryObservationsForGeoJSON.mockResolvedValueOnce([]);
      await getObservationsForGeoJSON();
      expect(exportRepository.queryObservationsForGeoJSON).toHaveBeenCalled();
    });
  });

  describe('getObservationsAndNetworksForJSON', () => {
    it('should return observations and networks merged', async () => {
      exportRepository.queryObservationsForJSON.mockResolvedValueOnce([{ id: 1 }]);
      exportRepository.queryNetworksForJSON.mockResolvedValueOnce([{ bssid: 'A' }]);

      const result = await getObservationsAndNetworksForJSON();
      expect(result.observations).toEqual([{ id: 1 }]);
      expect(result.networks).toEqual([{ bssid: 'A' }]);
    });
  });

  describe('getObservationsForKML', () => {
    it('should return empty for no BSSIDs', async () => {
      const result = await getObservationsForKML([]);
      expect(result).toEqual([]);
    });

    it('should call queryObservationsForKML for BSSIDs', async () => {
      exportRepository.queryObservationsForKML.mockResolvedValueOnce([{ id: 1 }]);
      const result = await getObservationsForKML(['A']);
      expect(result).toEqual([{ id: 1 }]);
      expect(exportRepository.queryObservationsForKML).toHaveBeenCalledWith(['A']);
    });
  });

  describe('getFullDatabaseSnapshot', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.FULL_EXPORT_MAX_ROWS_PER_TABLE = '100';
      process.env.FULL_EXPORT_MAX_ROWS_TOTAL = '150';
    });

    it('should respect table and total budget limits', async () => {
      exportRepository.queryAppTableNames.mockResolvedValueOnce(['table1', 'table2']);

      exportRepository.queryTableRowCount.mockResolvedValueOnce(200);
      exportRepository.queryTableRows.mockResolvedValueOnce(new Array(100).fill({}));

      exportRepository.queryTableRowCount.mockResolvedValueOnce(200);
      exportRepository.queryTableRows.mockResolvedValueOnce(new Array(50).fill({}));

      const snapshot = await getFullDatabaseSnapshot();

      expect(snapshot.tables['table1'].exportedRowCount).toBe(100);
      expect(snapshot.tables['table1'].truncated).toBe(true);

      expect(snapshot.tables['table2'].exportedRowCount).toBe(50);
      expect(snapshot.tables['table2'].truncated).toBe(true);

      expect(snapshot.truncated).toBe(true);
    });

    it('should handle empty database', async () => {
      exportRepository.queryAppTableNames.mockResolvedValueOnce([]);
      const snapshot = await getFullDatabaseSnapshot();
      expect(snapshot.tables).toEqual({});
      expect(snapshot.truncated).toBe(false);
    });
  });
});
