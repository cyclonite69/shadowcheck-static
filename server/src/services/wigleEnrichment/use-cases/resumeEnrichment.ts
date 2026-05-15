import logger from '../../../logging/logger';
import { resetRunForResume } from '../../../repositories/wigleEnrichmentRepository';
import { getActiveEnrichmentRunId } from '../repositories/enrichmentReadRepository';
import { runEnrichmentLoop } from './runEnrichmentLoop';

/**
 * Resume a paused or failed WiGLE enrichment run.
 */
export async function resumeEnrichment(runId: number) {
  const conflictId = await getActiveEnrichmentRunId(runId);
  if (conflictId !== null) {
    logger.warn(
      `[v3 Enrichment] Concurrency guard: run #${conflictId} active, skipping resume of #${runId}.`,
      { conflictId, runId }
    );
    throw Object.assign(
      new Error(
        `Enrichment run #${conflictId} is already active. Pause it before resuming run #${runId}.`
      ),
      { status: 409 }
    );
  }

  const row = await resetRunForResume(runId);
  if (!row) {
    throw new Error('Run not found');
  }

  void runEnrichmentLoop(runId);
  return row;
}
