import logger from '../../../../logging/logger';
import {
  getSiblingRefreshStatus,
  normalizeOptions,
  state,
  type SiblingRefreshOptions,
  type SiblingRefreshStatus,
} from '../../siblingDetectionState';
import { adminQuery } from '../adminQueryAdapter';
import { runSiblingRefreshJob } from './runSiblingRefreshJob';

/**
 * Launch the sibling refresh job in the background and update in-memory status.
 */
async function startSiblingRefresh(
  options: SiblingRefreshOptions = {}
): Promise<{ accepted: boolean; status: SiblingRefreshStatus }> {
  if (state.running) {
    return { accepted: false, status: getSiblingRefreshStatus() };
  }

  state.running = true;
  state.cancelRequested = false;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.lastError = null;
  state.lastResult = null;
  state.options = normalizeOptions(options);
  state.progress = {
    batchesRun: 0,
    seedsProcessed: 0,
    rowsUpserted: 0,
    lastCursor: null,
  };

  logger.info('[Siblings] Starting sibling refresh job', state.options);

  const capturedRunMode =
    state.options.maxBatches !== null ? 'test' : state.options.incremental ? 'incremental' : 'full';

  try {
    await adminQuery(
      `INSERT INTO app.background_job_runs (job_name, status, cron, started_at, details)
       VALUES ($1, $2, $3, now(), $4)`,
      ['siblingDetection', 'running', null, JSON.stringify(state.options)]
    );
    logger.info('[Siblings] Background job run record created');
  } catch (err: any) {
    logger.error('[Siblings] Failed to create background job run record', { error: err?.message });
  }

  runSiblingRefreshJob(state.options)
    .then((result) => {
      state.lastResult = result;
      logger.info('[Siblings] Sibling refresh job completed', result);
      adminQuery(
        `UPDATE app.background_job_runs 
         SET status = $1, finished_at = now(), 
             details = jsonb_build_object(
               'pairs_inserted', $4,
               'networks_scanned', $5,
               'run_mode', $6,
               'sibling_run_id', $7
             )
         WHERE job_name = $2 AND status = $3 ORDER BY id DESC LIMIT 1`,
        [
          'completed',
          'siblingDetection',
          'running',
          result.rowsUpserted,
          result.seedsProcessed,
          capturedRunMode,
          result.sibling_run_id,
        ]
      ).catch((err: any) => {
        logger.error('[Siblings] Failed to update background job run to completed', {
          error: err?.message,
        });
      });
    })
    .catch((err: any) => {
      state.lastError = err?.message || 'Unknown error';
      logger.error('[Siblings] Sibling refresh job failed', { error: err?.message });
      adminQuery(
        `SELECT id FROM app.sibling_runs 
         WHERE status = 'running' 
         ORDER BY id DESC LIMIT 1`
      )
        .then((runResult: any) => {
          const siblingRunId = runResult.rows[0]?.id || null;
          adminQuery(
            `UPDATE app.background_job_runs 
           SET status = $1, finished_at = now(), error = $2,
               details = jsonb_build_object(
                 'run_mode', $4,
                 'sibling_run_id', $5
               )
           WHERE job_name = $3 AND status = 'running' ORDER BY id DESC LIMIT 1`,
            [
              'failed',
              err?.message || 'Unknown error',
              'siblingDetection',
              capturedRunMode,
              siblingRunId,
            ]
          ).catch((updateErr: any) => {
            logger.error('[Siblings] Failed to update background job run to failed', {
              error: updateErr?.message,
            });
          });
        })
        .catch((queryErr: any) => {
          logger.error('[Siblings] Failed to query sibling_runs for failed job', {
            error: queryErr?.message,
          });
        });
    })
    .finally(() => {
      state.running = false;
      state.finishedAt = new Date().toISOString();
    });

  return { accepted: true, status: getSiblingRefreshStatus() };
}

export { startSiblingRefresh };
