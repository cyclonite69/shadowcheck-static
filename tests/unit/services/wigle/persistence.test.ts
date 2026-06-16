export {};

// Mock all deep dependencies of persistence.ts
const mockGetWigleDetail = jest.fn();
const mockGetWigleV3Observations = jest.fn();
const mockImportWigleV3NetworkDetail = jest.fn();
const mockImportWigleV3ObservationRow = jest.fn();
const mockInsertWigleV2SearchResult = jest.fn();
const mockInsertWigleBtSearchResult = jest.fn();

jest.mock('../../../server/src/repositories/wiglePersistenceRepository', () => ({
  getWigleDetail: mockGetWigleDetail,
  getWigleV3Observations: mockGetWigleV3Observations,
  importWigleV3NetworkDetail: mockImportWigleV3NetworkDetail,
  importWigleV3ObservationRow: mockImportWigleV3ObservationRow,
  insertWigleV2SearchResult: mockInsertWigleV2SearchResult,
  insertWigleBtSearchResult: mockInsertWigleBtSearchResult,
}));

const mockMapV3LocationToObservationRow = jest.fn();
const mockNormalizeMacAddress = jest.fn((mac: string) => mac.toUpperCase());

jest.mock('../../../server/src/services/wigleEnrichment/mappers/enrichmentMapper', () => ({
  mapV3LocationToObservationRow: mockMapV3LocationToObservationRow,
  normalizeMacAddress: mockNormalizeMacAddress,
}));

jest.mock('../../../server/src/services/wigle/shared', () => ({
  databaseExecutor: { query: jest.fn() },
}));

import {
  getStoredWigleDetail,
  importWigleV3NetworkDetail,
  importWigleV3Observation,
  importWigleV3ObservationRow,
  getWigleV3Observations,
  importWigleV2SearchResult,
  importWigleBtSearchResult,
} from '../../../../server/src/services/wigle/persistence';

describe('wigle/persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getStoredWigleDetail', () => {
    it('delegates to repository and returns its result', async () => {
      mockGetWigleDetail.mockResolvedValue([{ netid: 'AA:BB:CC:DD:EE:FF' }]);
      const result = await getStoredWigleDetail('AA:BB:CC:DD:EE:FF');
      expect(result).toEqual([{ netid: 'AA:BB:CC:DD:EE:FF' }]);
      expect(mockGetWigleDetail).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when repository returns empty', async () => {
      mockGetWigleDetail.mockResolvedValue([]);
      const result = await getStoredWigleDetail('XX:XX:XX:XX:XX:XX');
      expect(result).toEqual([]);
    });
  });

  describe('importWigleV3NetworkDetail', () => {
    it('delegates to repository persistWigleV3NetworkDetail', async () => {
      mockImportWigleV3NetworkDetail.mockResolvedValue(undefined);
      const data = { netid: 'AA:BB:CC:DD:EE:FF', ssid: 'Test' };
      await importWigleV3NetworkDetail(data);
      expect(mockImportWigleV3NetworkDetail).toHaveBeenCalledTimes(1);
    });

    it('propagates repository errors', async () => {
      mockImportWigleV3NetworkDetail.mockRejectedValue(new Error('DB write failed'));
      await expect(importWigleV3NetworkDetail({})).rejects.toThrow('DB write failed');
    });
  });

  describe('importWigleV3Observation', () => {
    it('normalizes mac, maps row, and delegates to repository', async () => {
      const fakeRow = { netid: 'AA:BB', lat: 41.0, lon: -87.0 };
      mockMapV3LocationToObservationRow.mockReturnValue(fakeRow);
      mockImportWigleV3ObservationRow.mockResolvedValue(1);

      const result = await importWigleV3Observation('aa:bb', { lat: 41.0 }, 'MyNet');
      expect(mockNormalizeMacAddress).toHaveBeenCalledWith('aa:bb');
      expect(mockMapV3LocationToObservationRow).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('falls back to raw netid when normalizeMacAddress returns null/empty', async () => {
      mockNormalizeMacAddress.mockReturnValueOnce('');
      mockMapV3LocationToObservationRow.mockReturnValue({});
      mockImportWigleV3ObservationRow.mockResolvedValue(1);

      await importWigleV3Observation('raw-mac', {}, null);

      const mapCall = mockMapV3LocationToObservationRow.mock.calls[0];
      // First arg should be 'raw-mac' (the fallback) since normalizeMacAddress returned ''
      expect(mapCall[0]).toBe('raw-mac');
    });
  });

  describe('importWigleV3ObservationRow', () => {
    it('delegates to repository with provided row', async () => {
      mockImportWigleV3ObservationRow.mockResolvedValue(3);
      const row = { netid: 'AA:BB', lat: 1, lon: 2 } as any;
      const result = await importWigleV3ObservationRow(row);
      expect(result).toBe(3);
      expect(mockImportWigleV3ObservationRow).toHaveBeenCalledWith(expect.anything(), row);
    });
  });

  describe('getWigleV3Observations', () => {
    it('returns observations from repository', async () => {
      const obs = [{ obs_id: 1, lat: 41.0 }];
      mockGetWigleV3Observations.mockResolvedValue(obs);
      const result = await getWigleV3Observations('AA:BB:CC');
      expect(result).toEqual(obs);
    });
  });

  describe('importWigleV2SearchResult', () => {
    it('delegates to insertWigleV2SearchResult and returns row count', async () => {
      mockInsertWigleV2SearchResult.mockResolvedValue(2);
      const network = { netid: 'XX', ssid: 'net' };
      const result = await importWigleV2SearchResult(network);
      expect(result).toBe(2);
      expect(mockInsertWigleV2SearchResult).toHaveBeenCalledTimes(1);
    });

    it('accepts a custom executor override', async () => {
      mockInsertWigleV2SearchResult.mockResolvedValue(1);
      const customExecutor = { query: jest.fn() } as any;
      await importWigleV2SearchResult({}, customExecutor);
      // The custom executor should be passed as first arg to the repo function
      expect(mockInsertWigleV2SearchResult).toHaveBeenCalledWith(customExecutor, {});
    });
  });

  describe('importWigleBtSearchResult', () => {
    it('delegates to insertWigleBtSearchResult and returns row count', async () => {
      mockInsertWigleBtSearchResult.mockResolvedValue(1);
      const device = { netid: 'BT:01' };
      const result = await importWigleBtSearchResult(device);
      expect(result).toBe(1);
      expect(mockInsertWigleBtSearchResult).toHaveBeenCalledTimes(1);
    });
  });
});
