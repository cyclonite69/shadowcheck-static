import {
  assertCanRequest,
  recordRequest,
  getQuotaStatus,
  resetQuotaLedger,
  recordConsecutive429,
  getCircuitBreakerStatus,
} from '../../../server/src/services/wigleRequestLedger';
import { adminQuery } from '../../../server/src/services/adminDbService';
import logger from '../../../server/src/logging/logger';

// Mock dependencies
jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/logging/logger');

// Mock wigleLimits so getSafeLimit returns the fallback synchronously without hitting the DB.
jest.mock('../../../server/src/services/wigleLimits', () => ({
  getSafeLimitSync: jest.fn().mockImplementation((kind: string) => {
    const defaults: Record<string, number> = { search: 50, detail: 200, stats: 49 };
    return defaults[kind] ?? 50;
  }),
  resetLimitsCache: jest.fn(),
}));

describe('wigleRequestLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQuotaLedger();
    jest.useFakeTimers();
    // Default mock for adminQuery
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });
    // Restore default getSafeLimitSync mock after any per-test overrides
    const { getSafeLimitSync } = require('../../../server/src/services/wigleLimits');
    (getSafeLimitSync as jest.Mock).mockImplementation((kind: string) => {
      const defaults: Record<string, number> = { search: 50, detail: 200, stats: 49 };
      return defaults[kind] ?? 50;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('limit enforcement', () => {
    it('allows requests within soft limit', () => {
      for (let i = 0; i < 49; i++) {
        recordRequest('search');
      }

      expect(() => assertCanRequest('search', 'interactive')).not.toThrow();
    });

    it('throws 429 when soft limit is reached', () => {
      for (let i = 0; i < 50; i++) {
        recordRequest('search');
      }

      expect(() => assertCanRequest('search', 'interactive')).toThrow(
        expect.objectContaining({
          status: 429,
          message: expect.stringContaining('soft limit reached'),
        })
      );
    });

    it('denies requests beyond soft limit', () => {
      for (let i = 0; i < 100; i++) {
        recordRequest('search');
      }

      expect(() => assertCanRequest('search', 'interactive')).toThrow(
        expect.objectContaining({ status: 429 })
      );
    });

    it('falls back to 49 for stats soft limit', () => {
      for (let i = 0; i < 48; i++) {
        recordRequest('stats');
      }
      expect(() => assertCanRequest('stats', 'interactive')).not.toThrow();

      recordRequest('stats');
      expect(() => assertCanRequest('stats', 'interactive')).toThrow(
        expect.objectContaining({ message: expect.stringMatching(/soft limit reached.*49\/49/) })
      );
    });
  });

  describe('rolling window pruning', () => {
    it('prunes old requests outside the 24h window', () => {
      recordRequest('search'); // at T=0

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000); // T = 24h + 1s

      expect(getQuotaStatus().counts.search).toBe(0);
    });

    it('retains requests within the 24h window', () => {
      recordRequest('search'); // at T=0

      jest.advanceTimersByTime(12 * 60 * 60 * 1000); // T = 12h

      expect(getQuotaStatus().counts.search).toBe(1);
    });
  });

  describe('DB integration', () => {
    it('attempts to persist events to the DB', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });
      await recordRequest('stats');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.wigle_ledger_events'),
        expect.arrayContaining(['stats'])
      );
    });

    it('handles DB failures gracefully without affecting in-memory state', async () => {
      (adminQuery as jest.Mock).mockRejectedValueOnce(new Error('DB Down'));

      await recordRequest('search');

      expect(getQuotaStatus().counts.search).toBe(1);
    });
  });

  describe('independent kind tracking', () => {
    it('tracks different kinds separately', () => {
      recordRequest('search');
      recordRequest('search');
      recordRequest('detail');

      const status = getQuotaStatus();
      expect(status.counts.search).toBe(2);
      expect(status.counts.detail).toBe(1);
      expect(status.counts.stats).toBe(0);
    });
  });

  describe('circuit breaker', () => {
    it('opens after 5 consecutive 429s', () => {
      for (let i = 0; i < 5; i++) recordConsecutive429();
      expect(getCircuitBreakerStatus().isOpen).toBe(true);
    });

    it('does not open before 5 consecutive 429s', () => {
      for (let i = 0; i < 4; i++) recordConsecutive429();
      expect(getCircuitBreakerStatus().isOpen).toBe(false);
    });

    it('blocks background requests when open', () => {
      for (let i = 0; i < 5; i++) recordConsecutive429();

      expect(() => assertCanRequest('search', 'background')).toThrow('circuit breaker');
      expect(() => assertCanRequest('detail', 'background')).toThrow('circuit breaker');
      expect(() => assertCanRequest('stats', 'background')).toThrow('circuit breaker');
    });

    it('does not block interactive requests when open', () => {
      for (let i = 0; i < 5; i++) recordConsecutive429();

      // interactive is never blocked by the circuit breaker
      expect(() => assertCanRequest('search', 'interactive')).not.toThrow();
    });

    it('resets cleanly via resetQuotaLedger', () => {
      for (let i = 0; i < 5; i++) recordConsecutive429();
      expect(getCircuitBreakerStatus().isOpen).toBe(true);

      resetQuotaLedger();
      expect(getCircuitBreakerStatus().isOpen).toBe(false);
    });

    it('consecutive429 counter resets after the breaker opens', () => {
      for (let i = 0; i < 5; i++) recordConsecutive429();

      jest.advanceTimersByTime(601_000); // 10 min + 1s
      expect(getCircuitBreakerStatus().isOpen).toBe(false);

      for (let i = 0; i < 4; i++) recordConsecutive429();
      expect(getCircuitBreakerStatus().isOpen).toBe(false);
    });
  });

  describe('Provenance and Exact Row Updates', () => {
    it('marks manual calls with manual source', async () => {
      await recordRequest('search', 'manual');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.wigle_ledger_events'),
        expect.arrayContaining(['manual'])
      );
    });

    it('marks scheduled KML sync with scheduled source', async () => {
      await recordRequest('search', 'scheduled');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app.wigle_ledger_events'),
        expect.arrayContaining(['scheduled'])
      );
    });

    it('updates the exact ledger row when ID is provided', async () => {
      const { updateLedgerOutcome } = require('../../../server/src/services/wigleRequestLedger');

      updateLedgerOutcome('search', 12345, {
        status: 'success',
        duration_ms: 100,
      });

      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $8'),
        expect.arrayContaining([12345])
      );
    });

    it('falls back to heuristic update when ID is null', async () => {
      const { updateLedgerOutcome } = require('../../../server/src/services/wigleRequestLedger');

      updateLedgerOutcome('search', null, {
        status: 'success',
        duration_ms: 100,
      });

      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY requested_at DESC, id DESC LIMIT 1'),
        expect.arrayContaining(['search'])
      );
    });

    it('stores retry-after hint on 429 responses', async () => {
      const { updateLedgerOutcome } = require('../../../server/src/services/wigleRequestLedger');

      updateLedgerOutcome('search', 12345, {
        status: 'error',
        duration_ms: 100,
        http_status: 429,
        retry_after_hint: 60,
      });

      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('retry_after_hint = $7'),
        expect.arrayContaining([60])
      );
    });
  });
});
