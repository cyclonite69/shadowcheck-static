import logger from '../../../../logging/logger';
import { REFRESH_CHUNK_SQL } from '../../siblingDetectionQueries';
import {
  normalizeOptions,
  state,
  type SiblingRefreshOptions,
  type SiblingRefreshResult,
} from '../../siblingDetectionState';
import { EXTRA_SIBLING_RULES, type SiblingExtraRuleDefinition } from '../rules/extraRules';
import { adminQuery, longRunningAdminQuery } from '../adminQueryAdapter';

type SiblingDetectionOrchestratorDeps = {
  adminQuery: typeof adminQuery;
  longRunningAdminQuery: typeof longRunningAdminQuery;
  normalizeOptions: typeof normalizeOptions;
  state: typeof state;
  extraRules: SiblingExtraRuleDefinition[];
};

const defaultDeps: SiblingDetectionOrchestratorDeps = {
  adminQuery,
  longRunningAdminQuery,
  normalizeOptions,
  state,
  extraRules: EXTRA_SIBLING_RULES,
};

/**
 * Coordinates the sibling refresh batch lifecycle, including chunked refresh,
 * extra rule execution, run bookkeeping, and progress updates.
 */
export class SiblingDetectionOrchestrator {
  constructor(private readonly deps: SiblingDetectionOrchestratorDeps = defaultDeps) {}

  /**
   * Execute a full sibling refresh run and return the persisted result summary.
   */
  async runRefreshJob(options: SiblingRefreshOptions = {}): Promise<SiblingRefreshResult> {
    const normalized = this.deps.normalizeOptions(options);
    const started = Date.now();
    const runMode =
      normalized.maxBatches !== null ? 'test' : normalized.incremental ? 'incremental' : 'full';

    const runInsert = await this.deps.adminQuery(
      `INSERT INTO app.sibling_runs
         (run_mode, max_octet_delta, min_confidence, batch_size, max_batches)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        runMode,
        normalized.maxOctetDelta,
        normalized.minCandidateConf,
        normalized.batchSize,
        normalized.maxBatches,
      ]
    );
    const runId: number = runInsert.rows[0].id;

    const cutoffResult = await this.deps.adminQuery(
      `SELECT MAX(computed_at) AS cutoff FROM app.network_sibling_pairs`
    );
    const incrementalCutoff: string | null = cutoffResult.rows[0]?.cutoff ?? null;

    let cursor: string | null = null;
    let batchesRun = 0;
    let seedsProcessed = 0;
    let rowsUpserted = 0;
    let completed = true;

    while (true) {
      if (this.deps.state.cancelRequested) {
        completed = false;
        logger.info('[Siblings] Cancel requested — stopping batch loop');
        break;
      }
      if (normalized.maxBatches !== null && batchesRun >= normalized.maxBatches) {
        completed = false;
        break;
      }

      const result: any = await this.deps.longRunningAdminQuery(REFRESH_CHUNK_SQL, [
        normalized.batchSize,
        cursor,
        normalized.maxOctetDelta,
        normalized.maxDistanceM,
        normalized.minCandidateConf,
        normalized.incremental,
        incrementalCutoff,
        runId,
      ]);

      const row = result.rows[0] || {};
      const seedCount = Number(row.seed_count || 0);
      const upsertedCount = Number(row.upserted_count || 0);
      const nextCursor = row.next_cursor || null;

      if (seedCount === 0) {
        if (!cursor || cursor >= 'FF:FF:FF:FF:FF:FF') {
          break;
        }
        break;
      }

      batchesRun += 1;
      seedsProcessed += seedCount;
      rowsUpserted += upsertedCount;
      cursor = nextCursor;

      this.deps.state.progress = {
        batchesRun,
        seedsProcessed,
        rowsUpserted,
        lastCursor: cursor,
      };

      if (batchesRun % 10 === 0) {
        logger.info('[Siblings] Batch progress', {
          batchesRun,
          seedsProcessed,
          rowsUpserted,
          lastCursor: cursor,
        });
      }
    }

    const extraRuleResults = await this.runExtraRules(runId);
    logger.info('[Siblings] Extra rules complete', extraRuleResults);

    const finalStatus = completed ? 'completed' : 'truncated';
    await this.deps.adminQuery(
      `UPDATE app.sibling_runs
       SET completed_at = now(), status = $1, networks_scanned = $2, pairs_inserted = $3, pairs_updated = $3
       WHERE id = $4`,
      [finalStatus, seedsProcessed, rowsUpserted, runId]
    );

    await this.deps.longRunningAdminQuery('SELECT app.refresh_oui_sibling_profiles()');
    logger.info('[Siblings] OUI sibling profiles refreshed');

    return {
      success: true,
      batchesRun,
      seedsProcessed,
      rowsUpserted,
      lastCursor: cursor,
      executionTimeMs: Date.now() - started,
      completed,
      sibling_run_id: runId,
    };
  }

  private async runExtraRules(runId: number) {
    const results: Record<string, number> = {};

    for (const rule of this.deps.extraRules) {
      results[rule.logKey] = await this.runExtraRule(rule, runId);
    }

    return results;
  }

  private async runExtraRule(rule: SiblingExtraRuleDefinition, runId: number) {
    try {
      const params = rule.includeRunId ? [runId] : [];
      const res: any = await this.deps.longRunningAdminQuery(rule.query, params);
      return Number(res.rows[0]?.count || 0);
    } catch (err: any) {
      logger.error(`[Siblings] Extra rule ${rule.name} failed:`, { error: err?.message });
      return 0;
    }
  }
}
