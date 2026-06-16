// Mock wigleRequestLedger to control quota status
const mockGetQuotaStatus = jest.fn();
jest.mock('../../../../server/src/services/wigleRequestLedger', () => ({
  getQuotaStatus: mockGetQuotaStatus,
}));

describe('rateLimitingStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sleep', () => {
    it('resolves after the specified delay', async () => {
      const { sleep } = require('../../../../server/src/services/wigleImport/rateLimitingStrategy');
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // allow slight timer inaccuracy
    });

    it('returns a Promise', () => {
      const { sleep } = require('../../../../server/src/services/wigleImport/rateLimitingStrategy');
      expect(sleep(0)).toBeInstanceOf(Promise);
    });
  });

  describe('getAdaptiveDelay', () => {
    it('returns a number greater than 0', () => {
      mockGetQuotaStatus.mockReturnValue({
        counts: { search: 10 },
        softLimits: { search: 100 },
      });
      const {
        getAdaptiveDelay,
      } = require('../../../../server/src/services/wigleImport/rateLimitingStrategy');
      const delay = getAdaptiveDelay();
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
    });

    it('returns higher delay at high quota utilization (>= baseDelay * 2)', () => {
      // At full utilization (1.0), multiplier = 1 + 1^2 = 2, so delay >= 3000 + jitter
      mockGetQuotaStatus.mockReturnValue({
        counts: { search: 100 },
        softLimits: { search: 100 },
      });
      const {
        getAdaptiveDelay,
      } = require('../../../../server/src/services/wigleImport/rateLimitingStrategy');
      const delay = getAdaptiveDelay();
      // baseDelay(1500) * multiplier(2) = 3000; jitter is 0-1000
      expect(delay).toBeGreaterThanOrEqual(3000);
    });

    it('returns lower delay at zero quota utilization', () => {
      mockGetQuotaStatus.mockReturnValue({
        counts: { search: 0 },
        softLimits: { search: 100 },
      });
      const {
        getAdaptiveDelay,
      } = require('../../../../server/src/services/wigleImport/rateLimitingStrategy');
      const delay = getAdaptiveDelay();
      // At 0% utilization: multiplier = 1 + 0^2 = 1, delay = 1500 + jitter
      // So delay should be between 1500 and 2500
      expect(delay).toBeGreaterThanOrEqual(1500);
      expect(delay).toBeLessThan(3000);
    });
  });
});
