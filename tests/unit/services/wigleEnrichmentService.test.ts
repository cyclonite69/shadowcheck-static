// MOCK EVERYTHING
const mockFetchWigle = jest.fn();
jest.mock('../../../server/src/services/wigleClient', () => ({ fetchWigle: mockFetchWigle }));

const mockFetchAndImportDetail = jest.fn();
jest.mock('../../../server/src/services/wigleEnrichmentFetcher', () => ({
  fetchAndImportDetail: (...args: any[]) => mockFetchAndImportDetail(...args),
}));

const mockCreateImportRun = jest.fn();
const mockGetImportRun = jest.fn();
const mockMarkRunControlStatus = jest.fn();
const mockCompleteRun = jest.fn();
const mockMarkRunFailure = jest.fn();
jest.mock('../../../server/src/services/wigleImport/runRepository', () => ({
  createImportRun: mockCreateImportRun,
  getImportRun: mockGetImportRun,
  markRunControlStatus: mockMarkRunControlStatus,
  completeRun: mockCompleteRun,
  markRunFailure: mockMarkRunFailure,
}));

jest.mock('../../../server/src/services/wigleRequestLedger', () => ({
  recordRequest: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockAdminQuery = jest.fn();
const mockSecretsGet = jest.fn((key: string) => 'test');
jest.mock('../../../server/src/config/container', () => ({
  adminDbService: { adminQuery: mockAdminQuery },
  wigleService: {
    importWigleV3NetworkDetail: jest.fn(),
    importWigleV3Observation: jest.fn(),
  },
  secretsManager: { get: mockSecretsGet },
}));

// MUST require after mocks
const {
  runEnrichmentLoop,
  startBatchEnrichment,
} = require('../../../server/src/services/wigleEnrichmentService');

describe('wigleEnrichmentService (Pure Unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockAdminQuery.mockResolvedValue({ rows: [] });
    mockSecretsGet.mockImplementation((key: string) => 'test');
  });

  describe('runEnrichmentLoop', () => {
    it('pauses run when WiGLE returns 429', async () => {
      mockGetImportRun.mockResolvedValue({ id: 1, status: 'running' });

      mockAdminQuery
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // Loop start status check
        .mockResolvedValueOnce({ rows: [{ bssid: 'B1', type: 'WIFI' }] }); // getNextEnrichmentBatch

      mockFetchAndImportDetail.mockRejectedValueOnce(
        Object.assign(new Error('Too many requests'), { status: 429 })
      );

      await runEnrichmentLoop(1);

      expect(mockMarkRunControlStatus).toHaveBeenCalledWith(1, 'paused');
    });

    it('completes run when batch is empty', async () => {
      mockGetImportRun.mockResolvedValue({ id: 1, status: 'running' });

      mockAdminQuery
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // status check
        .mockResolvedValueOnce({ rows: [] }); // empty batch

      await runEnrichmentLoop(1);

      expect(mockCompleteRun).toHaveBeenCalledWith(1);
    });
  });

  describe('startBatchEnrichment', () => {
    it('creates full-catalog enrichment runs with direct source/version/search metadata', async () => {
      mockAdminQuery
        .mockResolvedValueOnce({ rows: [{ count: 12 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      mockCreateImportRun.mockResolvedValue({ id: 99 });
      mockGetImportRun.mockResolvedValue({ id: 99, status: 'completed' });

      await startBatchEnrichment();

      expect(mockCreateImportRun).toHaveBeenCalledWith(
        {
          version: 'v3',
          source: 'v3_batch',
          searchTerm: 'Full Catalog Enrichment',
          resultsPerPage: 1,
          pendingItems: 12,
        },
        {
          source: 'v3_batch',
          api_version: 'v3',
          search_term: 'Full Catalog Enrichment',
        }
      );
    });

    it('creates manual enrichment runs with direct source/version/search metadata', async () => {
      mockAdminQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
      mockCreateImportRun.mockResolvedValue({ id: 100 });
      mockGetImportRun.mockResolvedValue({ id: 100, status: 'completed' });

      await startBatchEnrichment(['AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66']);

      expect(mockCreateImportRun).toHaveBeenCalledWith(
        {
          version: 'v3',
          source: 'v3_manual',
          searchTerm: 'Targeted Enrichment (2 items)',
          resultsPerPage: 1,
          pendingItems: 2,
        },
        {
          source: 'v3_manual',
          api_version: 'v3',
          search_term: 'Targeted Enrichment (2 items)',
        }
      );
    });
  });
});
