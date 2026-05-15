import logger from '../../../logging/logger';
import { forceClearRun } from '../../../repositories/wigleEnrichmentRepository';

/**
 * Force-clear a stuck running enrichment run so operators can start a new one.
 */
export async function forceClearEnrichmentRun(runId: number): Promise<{ cleared: boolean }> {
  const cleared = await forceClearRun(runId);
  if (cleared) {
    logger.warn(`[v3 Enrichment] Force-cleared stuck run #${runId}`);
  }
  return { cleared };
}
