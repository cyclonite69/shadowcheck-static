import logger from '../../../logging/logger';
import { fetchAndImportDetail } from '../../wigleEnrichmentFetcher';
import { assertCanRequest } from '../../wigleRequestLedger';
import {
  getNextEnrichmentBatch,
  getRunStatus,
  incrementRunProgress,
  refreshWigleNetworksMv,
} from '../../../repositories/wigleEnrichmentRepository';
import {
  completeRun,
  getImportRun,
  markRunControlStatus,
  markRunFailure,
} from '../../wigleImport/runRepository';

const ENRICHMENT_DELAY_MS = 20_000;
const MAX_CONSECUTIVE_ERRORS = 5;

type EnrichmentBatchItem = {
  bssid: string;
  type: string;
};

type WigleEnrichmentOrchestratorDeps = {
  getImportRun: typeof getImportRun;
  getRunStatus: typeof getRunStatus;
  getNextEnrichmentBatch: typeof getNextEnrichmentBatch;
  markRunFailure: typeof markRunFailure;
  completeRun: typeof completeRun;
  refreshWigleNetworksMv: typeof refreshWigleNetworksMv;
  markRunControlStatus: typeof markRunControlStatus;
  assertCanRequest: typeof assertCanRequest;
  fetchAndImportDetail: typeof fetchAndImportDetail;
  incrementRunProgress: typeof incrementRunProgress;
  sleep: (ms: number) => Promise<void>;
  delayMs: number;
  maxConsecutiveErrors: number;
};

const defaultDeps: WigleEnrichmentOrchestratorDeps = {
  getImportRun,
  getRunStatus,
  getNextEnrichmentBatch,
  markRunFailure,
  completeRun,
  refreshWigleNetworksMv,
  markRunControlStatus,
  assertCanRequest,
  fetchAndImportDetail,
  incrementRunProgress,
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  delayMs: ENRICHMENT_DELAY_MS,
  maxConsecutiveErrors: MAX_CONSECUTIVE_ERRORS,
};

/**
 * Coordinates the WiGLE v3 enrichment loop for both full-catalog and targeted runs.
 * Owns polling, quota checks, retry boundaries, and terminal run-state transitions.
 */
export class WigleEnrichmentOrchestrator {
  constructor(private readonly deps: WigleEnrichmentOrchestratorDeps = defaultDeps) {}

  /**
   * Run the enrichment loop for a persisted import run until completion or pause.
   */
  async run(runId: number, manualList?: string[]) {
    const run = await this.deps.getImportRun(runId);
    if (!run) {
      throw new Error(`WiGLE enrichment run ${runId} not found`);
    }
    if (run.status === 'completed' || run.status === 'cancelled') {
      return run;
    }

    const processed = new Set<string>();
    let consecutiveErrors = 0;

    logger.info(
      `[v3 Enrichment] Starting batch loop for run #${runId}${manualList ? ` (Manual: ${manualList.length} items)` : ''}`
    );

    try {
      for (;;) {
        const currentStatus = await this.deps.getRunStatus(runId);
        if (currentStatus === 'paused' || currentStatus === 'cancelled') {
          logger.info(`[v3 Enrichment] Loop stopped: ${currentStatus}`);
          return;
        }

        const batch = await this.loadNextBatch(processed, manualList);
        if (batch.length === 0) {
          return this.finishRun(runId, processed, manualList);
        }

        for (const item of batch) {
          const shouldStop = await this.processBatchItem(runId, item, processed, {
            consecutiveErrors,
            setConsecutiveErrors: (value) => {
              consecutiveErrors = value;
            },
          });
          if (shouldStop) {
            return;
          }
        }
      }
    } catch (err: any) {
      await this.deps.markRunFailure(runId, err.message);
      logger.error(`[v3 Enrichment] Fatal loop error: ${err.message}`);
    }
  }

  private async loadNextBatch(processed: Set<string>, manualList?: string[]) {
    const activeManualList = manualList
      ? manualList.filter((bssid) => !processed.has(bssid))
      : undefined;
    return this.deps.getNextEnrichmentBatch(5, activeManualList);
  }

  private async finishRun(runId: number, processed: Set<string>, manualList?: string[]) {
    if (manualList && processed.size === 0) {
      await this.deps.markRunFailure(
        runId,
        'No matching networks found in catalog for provided BSSIDs'
      );
      logger.warn(`[v3 Enrichment] Manual run #${runId} failed: No matching networks found`);
    } else {
      await this.deps.completeRun(runId);
      logger.info(`[v3 Enrichment] Completed run #${runId}`);
    }

    try {
      await this.deps.refreshWigleNetworksMv();
      logger.info('[v3 Enrichment] Refreshed api_wigle_networks_mv');
    } catch (mvErr: any) {
      logger.warn('[v3 Enrichment] MV refresh skipped (not yet applied?):', mvErr.message);
    }
  }

  private async processBatchItem(
    runId: number,
    item: EnrichmentBatchItem,
    processed: Set<string>,
    state: {
      consecutiveErrors: number;
      setConsecutiveErrors: (value: number) => void;
    }
  ) {
    try {
      this.deps.assertCanRequest('detail', 'background');
    } catch (limitErr: any) {
      await this.deps.markRunControlStatus(runId, 'paused');
      logger.warn(
        `[v3 Enrichment] Detail soft-limit reached. Pausing run #${runId}: ${limitErr.message}`
      );
      return true;
    }

    try {
      await this.deps.fetchAndImportDetail(item.bssid, item.type);
      processed.add(item.bssid);
      state.setConsecutiveErrors(0);
      await this.deps.incrementRunProgress(runId);

      if (process.env.NODE_ENV !== 'test') {
        await this.deps.sleep(this.deps.delayMs);
      }
      return false;
    } catch (err: any) {
      if (this.isThrottleError(err)) {
        await this.deps.markRunControlStatus(runId, 'paused');
        logger.warn(`[v3 Enrichment] WiGLE blocked/throttled. Pausing run #${runId}`);
        return true;
      }

      logger.error(`[v3 Enrichment] Failed item ${item.bssid} in run #${runId}: ${err.message}`);
      processed.add(item.bssid);

      const nextErrorCount = state.consecutiveErrors + 1;
      state.setConsecutiveErrors(nextErrorCount);

      if (nextErrorCount >= this.deps.maxConsecutiveErrors) {
        await this.deps.markRunFailure(
          runId,
          `${this.deps.maxConsecutiveErrors} consecutive failures, possible rate limit or service outage`
        );
        logger.warn(
          `[v3 Enrichment] Aborting run #${runId} — ${this.deps.maxConsecutiveErrors} consecutive failures, possible rate limit or service outage`
        );
        return true;
      }

      return false;
    }
  }

  private isThrottleError(err: any) {
    return (
      err?.status === 429 ||
      err?.status === 403 ||
      err?.message?.includes('429') ||
      err?.message?.includes('403')
    );
  }
}
