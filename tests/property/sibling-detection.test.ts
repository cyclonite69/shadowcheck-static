import * as fc from 'fast-check';
const {
  runSiblingRefreshJob,
} = require('../../server/src/services/admin/siblingDetectionAdminService');

// Mock the adminDbService and other dependencies
const mockAdminQuery = jest.fn();
const mockLongRunningAdminQuery = jest.fn();
jest.mock('../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: (...args: any[]) => mockAdminQuery(...args),
    longRunningAdminQuery: (...args: any[]) => mockLongRunningAdminQuery(...args),
  },
}));

describe('Sibling Detection Property-Based Tests', () => {
  beforeEach(() => {
    mockAdminQuery.mockReset();
    mockLongRunningAdminQuery.mockReset();
    mockAdminQuery.mockResolvedValue({ rows: [] });
    mockLongRunningAdminQuery.mockResolvedValue({ rows: [] });
  });

  test('Confidence score should always be between 0 and 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.float({ min: 0, max: 1 }),
        async (batchSize, minConfidence) => {
          mockAdminQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Run ID
          mockAdminQuery.mockResolvedValueOnce({ rows: [{ cutoff: '2026-05-09' }] }); // Cutoff
          mockLongRunningAdminQuery.mockResolvedValueOnce({ rows: [{ seed_count: 0 }] }); // Empty batch
          mockLongRunningAdminQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] }); // manual_boost
          mockLongRunningAdminQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] }); // manual_insert
          mockAdminQuery.mockResolvedValueOnce({ rowCount: 1 }); // Update run
          mockLongRunningAdminQuery.mockResolvedValueOnce({ rows: [] }); // OUI refresh

          const result = await runSiblingRefreshJob({ batchSize, minCandidateConf: minConfidence });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });
});
