import logger from '../logging/logger';

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

function assertCanRequest(kind: WigleRequestKind, entrypoint: string) {
  const count = getCount(kind);
  const softLimit = getSoftLimit(kind);
  const hardLimit = getHardLimit(kind);

  if (count >= softLimit) {
    const error: any = new Error(
      `WiGLE ${kind} soft limit reached for the rolling 24-hour window (${count}/${softLimit}).`
    );
    error.status = 429;
    error.code = count >= hardLimit ? 'WIGLE_HARD_LIMIT' : 'WIGLE_SOFT_LIMIT';
    error.kind = kind;

    logger.warn('[WiGLE] Request blocked by in-process quota ledger', {
      entrypoint,
      kind,
      count,
      softLimit,
      hardLimit,
      code: error.code,
    });

    throw error;
  }
}

function recordRequest(kind: WigleRequestKind) {
  prune(kind);
  requestLedger[kind].push(Date.now());
}

function resetQuotaLedger() {
  requestLedger.search = [];
  requestLedger.detail = [];
  requestLedger.stats = [];
}

export { assertCanRequest, getQuotaStatus, recordRequest, resetQuotaLedger };
