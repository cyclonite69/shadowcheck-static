import logger from '../logging/logger';
import { adminQuery } from './adminDbService';

export {};

type WigleRequestKind = 'search' | 'detail' | 'stats';

const WINDOW_MS = 24 * 60 * 60 * 1000;

const DEFAULT_SOFT_LIMITS: Record<WigleRequestKind, number> = {
  search: 50,
  detail: 200,
  stats: 10,
};

const requestLedger: Record<WigleRequestKind, number[]> = {
  search: [],
  detail: [],
  stats: [],
};

function getSoftLimit(kind: WigleRequestKind) {
  const value = Number(process.env[`WIGLE_SOFT_LIMIT_${kind.toUpperCase()}`]);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SOFT_LIMITS[kind];
}

function getHardLimit(kind: WigleRequestKind) {
  return getSoftLimit(kind) * 2;
}

function prune(kind: WigleRequestKind, now = Date.now()) {
  requestLedger[kind] = requestLedger[kind].filter((timestamp) => now - timestamp < WINDOW_MS);
}

function pruneAll(now = Date.now()) {
  prune('search', now);
  prune('detail', now);
  prune('stats', now);
}

function getCount(kind: WigleRequestKind) {
  prune(kind);
  return requestLedger[kind].length;
}

function getQuotaStatus() {
  pruneAll();

  return {
    windowHours: 24,
    counts: {
      search: getCount('search'),
      detail: getCount('detail'),
      stats: getCount('stats'),
    },
    softLimits: {
      search: getSoftLimit('search'),
      detail: getSoftLimit('detail'),
      stats: getSoftLimit('stats'),
    },
    hardLimits: {
      search: getHardLimit('search'),
      detail: getHardLimit('detail'),
      stats: getHardLimit('stats'),
    },
  };
}

let consecutive429 = 0;
let breakerOpenUntil = 0;

function recordConsecutive429() {
  consecutive429 += 1;
  if (consecutive429 >= 5) {
    breakerOpenUntil = Date.now() + 600000; // 10 mins
    consecutive429 = 0;
  }
}

function assertCanRequest(kind: WigleRequestKind, priority: 'interactive' | 'background') {
  if (Date.now() < breakerOpenUntil && priority === 'background') {
    const error: any = new Error('Global circuit breaker is OPEN for background tasks');
    error.status = 503;
    throw error;
  }

  const count = getCount(kind);
  const softLimit = getSoftLimit(kind);
  const hardLimit = getHardLimit(kind);

  if (count >= softLimit) {
    const error: any = new Error(`WiGLE ${kind} soft limit reached (${count}/${softLimit}).`);
    error.status = 429;
    error.kind = kind;
    throw error;
  }
}

function recordRequest(
  kind: WigleRequestKind,
  outcome: { status?: string; duration_ms?: number; error_message?: string } = {}
) {
  prune(kind);
  requestLedger[kind].push(Date.now());

  const { status = 'success', duration_ms, error_message } = outcome;

  // Fire-and-forget — do not await; ledger performance must not degrade
  void adminQuery(
    `INSERT INTO app.wigle_ledger_events (kind, status, duration_ms, error_message)
     VALUES ($1, $2, $3, $4)`,
    [kind, status, duration_ms ?? null, error_message ?? null]
  ).catch((err: any) => {
    logger.warn('[WiGLE Ledger] DB write failed — in-memory state is still accurate', {
      kind,
      error: err?.message || String(err),
    });
  });
}

function resetCircuitBreaker() {
  consecutive429 = 0;
  breakerOpenUntil = 0;
}

function resetQuotaLedger() {
  requestLedger.search = [];
  requestLedger.detail = [];
  requestLedger.stats = [];
  resetCircuitBreaker();
}

async function hydrateLedger() {
  try {
    // Keep the table lean: prune events older than the 24h window plus 1h grace
    await adminQuery(
      `DELETE FROM app.wigle_ledger_events WHERE requested_at < NOW() - INTERVAL '25 hours'`
    );

    const { rows } = await adminQuery(
      `SELECT kind, (EXTRACT(EPOCH FROM requested_at) * 1000)::bigint AS ts_ms
       FROM app.wigle_ledger_events
       WHERE requested_at > NOW() - INTERVAL '24 hours'
       ORDER BY requested_at ASC`
    );

    for (const row of rows) {
      const kind = row.kind as WigleRequestKind;
      if (requestLedger[kind] !== undefined) {
        requestLedger[kind].push(Number(row.ts_ms));
      }
    }

    logger.info('[WiGLE Ledger] Hydrated from DB', {
      search: requestLedger.search.length,
      detail: requestLedger.detail.length,
      stats: requestLedger.stats.length,
    });
  } catch (err: any) {
    logger.warn('[WiGLE Ledger] Hydration failed — starting with empty ledger', {
      error: err?.message || String(err),
    });
  }
}

if (process.env.NODE_ENV !== 'test') {
  void hydrateLedger();
}

function getCircuitBreakerStatus() {
  return { isOpen: Date.now() < breakerOpenUntil };
}

/**
 * Update the most recent ledger event for a given kind with outcome data.
 * Called by wigleGateway after the response is received.
 * Fire-and-forget — never throws.
 */
function updateLedgerOutcome(
  kind: WigleRequestKind,
  outcome: { status: string; duration_ms: number; error_message?: string }
) {
  void adminQuery(
    `UPDATE app.wigle_ledger_events
     SET status = $2, duration_ms = $3, error_message = $4
     WHERE id = (
       SELECT id FROM app.wigle_ledger_events
       WHERE kind = $1
       ORDER BY requested_at DESC, id DESC
       LIMIT 1
     )`,
    [kind, outcome.status, outcome.duration_ms, outcome.error_message ?? null]
  ).catch((err: any) => {
    logger.warn('[WiGLE Ledger] Outcome update failed', {
      kind,
      error: err?.message || String(err),
    });
  });
}

export {
  assertCanRequest,
  getQuotaStatus,
  recordRequest,
  updateLedgerOutcome,
  resetQuotaLedger,
  resetCircuitBreaker,
  recordConsecutive429,
  getCircuitBreakerStatus,
};
