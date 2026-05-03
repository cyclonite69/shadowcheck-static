/**
 * Integration tests for table upgrade route handlers
 * Verifies sortBy/sortDir parameter passing and SQL injection prevention
 * Tests:
 * - GET /api/v1/wigle/enrichment/catalog
 * - GET /api/admin/orphan-networks
 * - GET /api/v1/wigle/search-api/import-runs
 */

export {};

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../server/src/config/container', () => ({
  wigleImportRunService: {
    listImportRuns: jest.fn(),
    validateImportQuery: jest.fn(() => null),
  },
  adminOrphanNetworksService: {
    listOrphanNetworks: jest.fn(),
    getOrphanNetworkCounts: jest.fn(),
  },
  wigleEnrichmentService: {
    getEnrichmentCatalog: jest.fn(),
  },
}));

jest.mock('../../server/src/services/wigleSearchService', () => ({
  getSavedSsidTerms: jest.fn(),
}));

jest.mock('../../server/src/utils/asyncHandler', () => ({
  asyncHandler: (fn: any) => fn,
}));

const express = require('express');
const request = require('supertest');
const container = require('../../server/src/config/container');

describe('Route handlers for table upgrade', () => {
  describe('GET /api/v1/wigle/enrichment/catalog', () => {
    let app: any;

    beforeEach(() => {
      jest.clearAllMocks();
      app = express();
      const enrichmentRoutes = require('../../server/src/api/routes/v1/wigle/enrichment');
      app.use('/api/v1/wigle', enrichmentRoutes.default);
    });

    it('should pass sortBy and sortDir to service', async () => {
      (container.wigleEnrichmentService.getEnrichmentCatalog as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await request(app)
        .get('/api/v1/wigle/enrichment/catalog')
        .query({ sortBy: 'ssid', sortDir: 'desc' });

      expect(container.wigleEnrichmentService.getEnrichmentCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'ssid',
          sortDir: 'desc',
        })
      );
    });

    it('should pass multiple sort keys with comma separation', async () => {
      (container.wigleEnrichmentService.getEnrichmentCatalog as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await request(app)
        .get('/api/v1/wigle/enrichment/catalog')
        .query({ sortBy: 'firsttime,lasttime', sortDir: 'asc,desc' });

      expect(container.wigleEnrichmentService.getEnrichmentCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'firsttime,lasttime',
          sortDir: 'asc,desc',
        })
      );
    });

    it('should pass page and limit to service', async () => {
      (container.wigleEnrichmentService.getEnrichmentCatalog as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 100,
        page: 2,
        limit: 25,
      });

      await request(app).get('/api/v1/wigle/enrichment/catalog').query({ page: 2, limit: 25 });

      expect(container.wigleEnrichmentService.getEnrichmentCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 25,
        })
      );
    });

    it('should pass filter parameters (region, city, ssid, bssid)', async () => {
      (container.wigleEnrichmentService.getEnrichmentCatalog as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await request(app)
        .get('/api/v1/wigle/enrichment/catalog')
        .query({ region: 'CA', city: 'SF', ssid: 'FBI', bssid: 'AA:BB:CC' });

      expect(container.wigleEnrichmentService.getEnrichmentCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'CA',
          city: 'SF',
          ssid: 'FBI',
          bssid: 'AA:BB:CC',
        })
      );
    });

    it('should return catalog data', async () => {
      (container.wigleEnrichmentService.getEnrichmentCatalog as jest.Mock).mockResolvedValueOnce({
        data: [{ bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'TestNet' }],
        total: 100,
        page: 1,
        limit: 50,
      });

      const response = await request(app).get('/api/v1/wigle/enrichment/catalog');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(100);
    });

    it('should not filter invalid sortBy at route level (allowlist is in service)', async () => {
      (container.wigleEnrichmentService.getEnrichmentCatalog as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await request(app)
        .get('/api/v1/wigle/enrichment/catalog')
        .query({ sortBy: 'DROP TABLE; --' });

      // Route should pass it as-is to service, service applies allowlist
      expect(container.wigleEnrichmentService.getEnrichmentCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'DROP TABLE; --',
        })
      );
    });
  });

  describe('GET /api/admin/orphan-networks', () => {
    let app: any;

    beforeEach(() => {
      jest.clearAllMocks();
      app = express();
      const orphanRoutes = require('../../server/src/api/routes/v1/admin/import/orphans');
      app.use('/api', orphanRoutes);
    });

    it('should pass sortBy and sortDir to service', async () => {
      (container.adminOrphanNetworksService.listOrphanNetworks as jest.Mock).mockResolvedValueOnce(
        []
      );
      (
        container.adminOrphanNetworksService.getOrphanNetworkCounts as jest.Mock
      ).mockResolvedValueOnce({
        total: 0,
      });

      await request(app)
        .get('/api/admin/orphan-networks')
        .query({ sortBy: 'bssid', sortDir: 'asc' });

      expect(container.adminOrphanNetworksService.listOrphanNetworks).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'bssid',
          sortDir: 'asc',
        })
      );
    });

    it('should pass multiple sort keys with comma separation', async () => {
      (container.adminOrphanNetworksService.listOrphanNetworks as jest.Mock).mockResolvedValueOnce(
        []
      );
      (
        container.adminOrphanNetworksService.getOrphanNetworkCounts as jest.Mock
      ).mockResolvedValueOnce({
        total: 0,
      });

      await request(app)
        .get('/api/admin/orphan-networks')
        .query({ sortBy: 'moved_at,bssid', sortDir: 'desc,asc' });

      expect(container.adminOrphanNetworksService.listOrphanNetworks).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'moved_at,bssid',
          sortDir: 'desc,asc',
        })
      );
    });

    it('should pass limit and offset to service', async () => {
      (container.adminOrphanNetworksService.listOrphanNetworks as jest.Mock).mockResolvedValueOnce(
        []
      );
      (
        container.adminOrphanNetworksService.getOrphanNetworkCounts as jest.Mock
      ).mockResolvedValueOnce({
        total: 0,
      });

      await request(app).get('/api/admin/orphan-networks').query({ limit: 100, offset: 50 });

      expect(container.adminOrphanNetworksService.listOrphanNetworks).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          offset: 50,
        })
      );
    });

    it('should pass search filter', async () => {
      (container.adminOrphanNetworksService.listOrphanNetworks as jest.Mock).mockResolvedValueOnce(
        []
      );
      (
        container.adminOrphanNetworksService.getOrphanNetworkCounts as jest.Mock
      ).mockResolvedValueOnce({
        total: 0,
      });

      await request(app).get('/api/admin/orphan-networks').query({ search: 'AA:BB:CC' });

      expect(container.adminOrphanNetworksService.listOrphanNetworks).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'AA:BB:CC',
        })
      );
    });

    it('should return orphan network data with pagination', async () => {
      (container.adminOrphanNetworksService.listOrphanNetworks as jest.Mock).mockResolvedValueOnce([
        { bssid: 'AA:BB:CC:DD:EE:FF', observations_imported: 10 },
      ]);
      (
        container.adminOrphanNetworksService.getOrphanNetworkCounts as jest.Mock
      ).mockResolvedValueOnce({
        total: 50,
      });

      const response = await request(app).get('/api/admin/orphan-networks');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.rows).toHaveLength(1);
      expect(response.body.total).toBe(50);
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should not filter invalid sortBy at route level (allowlist is in service)', async () => {
      (container.adminOrphanNetworksService.listOrphanNetworks as jest.Mock).mockResolvedValueOnce(
        []
      );
      (
        container.adminOrphanNetworksService.getOrphanNetworkCounts as jest.Mock
      ).mockResolvedValueOnce({
        total: 0,
      });

      await request(app).get('/api/admin/orphan-networks').query({ sortBy: 'DELETE FROM; --' });

      // Route should pass it as-is to service, service applies allowlist
      expect(container.adminOrphanNetworksService.listOrphanNetworks).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'DELETE FROM; --',
        })
      );
    });
  });

  describe('GET /api/v1/wigle/search-api/import-runs', () => {
    let app: any;

    beforeEach(() => {
      jest.clearAllMocks();
      app = express();
      const searchRoutes = require('../../server/src/api/routes/v1/wigle/search');
      app.use('/api/v1/wigle', searchRoutes.default);
    });

    it('should pass page, limit, sortBy, sortDir to service', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
      });

      await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ page: 2, limit: 50, sortBy: 'status', sortDir: 'desc' });

      expect(container.wigleImportRunService.listImportRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 50, // (page 2 - 1) * limit 50
          sortBy: 'status',
          sortDir: 'desc',
        })
      );
    });

    it('should pass status filter', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
      });

      await request(app).get('/api/v1/wigle/search-api/import-runs').query({ status: 'completed' });

      expect(container.wigleImportRunService.listImportRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should pass state and searchTerm filters', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
      });

      await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ state: 'CA', searchTerm: 'fbi' });

      expect(container.wigleImportRunService.listImportRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'CA',
          searchTerm: 'fbi',
        })
      );
    });

    it('should pass incompleteOnly filter', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
      });

      await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ incompleteOnly: 'true' });

      expect(container.wigleImportRunService.listImportRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          incompleteOnly: true,
        })
      );
    });

    it('should return import runs with pagination info', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [{ id: 1, status: 'completed' }],
        total: 100,
        limit: 50,
        offset: 50,
      });

      const response = await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ page: 2, limit: 50 });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.runs).toHaveLength(1);
      expect(response.body.total).toBe(100);
      expect(response.body.hasMore).toBe(true); // 50 + 1 < 100
    });

    it('should not filter invalid sortBy at route level (allowlist is in service)', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
      });

      await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ sortBy: 'DROP TABLE; --' });

      // Route should pass it as-is to service, service applies allowlist
      expect(container.wigleImportRunService.listImportRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'DROP TABLE; --',
        })
      );
    });

    it('should calculate hasMore correctly', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
        total: 100,
        limit: 50,
        offset: 0,
      });

      const response = await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ limit: 50 });

      expect(response.body.hasMore).toBe(true); // 0 + 2 < 100
    });

    it('should set hasMore to false when at end of results', async () => {
      (container.wigleImportRunService.listImportRuns as jest.Mock).mockResolvedValueOnce({
        data: [{ id: 1 }],
        total: 101,
        limit: 50,
        offset: 100,
      });

      const response = await request(app)
        .get('/api/v1/wigle/search-api/import-runs')
        .query({ page: 3, limit: 50 });

      expect(response.body.hasMore).toBe(false); // 100 + 1 not < 101
    });
  });
});
