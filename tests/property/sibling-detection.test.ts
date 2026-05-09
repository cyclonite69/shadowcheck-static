import * as fc from 'fast-check';
const {
  runSiblingRefreshJob,
} = require('../../server/src/services/admin/siblingDetectionAdminService');

// Mock the adminDbService and other dependencies
const mockAdminQuery = jest.fn();
jest.mock('../../server/src/config/container', () => ({
  adminDbService: {
    adminQuery: mockAdminQuery,
  },
}));

describe('Sibling Detection Property-Based Tests', () => {
  beforeEach(() => {
    mockAdminQuery.mockClear();
  });

  test('Confidence score should always be between 0 and 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.float({ min: 0, max: 1 }),
        async (batchSize, minConfidence) => {
          mockAdminQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Run ID
          mockAdminQuery.mockResolvedValueOnce({ rows: [{ cutoff: '2026-05-09' }] }); // Cutoff
          mockAdminQuery.mockResolvedValueOnce({ rows: [] }); // End of stream
          mockAdminQuery.mockResolvedValueOnce({ rows: [] }); // Extra rules
          mockAdminQuery.mockResolvedValueOnce({ rowCount: 1 }); // Update run
          mockAdminQuery.mockResolvedValueOnce({ rows: [] }); // OUI refresh

          const result = await runSiblingRefreshJob({ batchSize, minCandidateConf: minConfidence });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });
});
