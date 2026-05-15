import logger from '../../../logging/logger';
import { setRunTotalItems } from '../../../repositories/wigleEnrichmentRepository';
import {
  getActiveEnrichmentRunId,
  getPendingEnrichmentCount,
} from '../repositories/enrichmentReadRepository';
import { createImportRun } from '../../wigleImport/runRepository';
import { runEnrichmentLoop } from './runEnrichmentLoop';

export const MAX_TARGETED_ENRICHMENT_BATCH = 100;

/**
 * Start a new WiGLE enrichment run, either full-catalog or targeted.
 */
export async function startBatchEnrichment(bssids?: string[]) {
  const isManual = Array.isArray(bssids) && bssids.length > 0;
  const normalizedBssids = isManual
    ? bssids!.map((b) => b.trim().toUpperCase()).filter((b) => b.length > 0)
    : undefined;

  if (isManual && normalizedBssids!.length === 0) {
    throw new Error('No valid BSSIDs provided for enrichment');
  }

  if (isManual && normalizedBssids!.length > MAX_TARGETED_ENRICHMENT_BATCH) {
    throw Object.assign(
      new Error(
        `Too many BSSIDs (${normalizedBssids!.length}). Maximum ${MAX_TARGETED_ENRICHMENT_BATCH} per targeted run.`
      ),
      { status: 400 }
    );
  }
  const source = isManual ? 'v3_manual' : 'v3_batch';
  const searchTerm = isManual
    ? `Targeted Enrichment (${normalizedBssids!.length} items)`
    : 'Full Catalog Enrichment';

  const pending = isManual ? normalizedBssids!.length : await getPendingEnrichmentCount();
  if (pending === 0) {
    throw new Error(
      isManual ? 'No valid BSSIDs provided for enrichment' : 'No networks found in v2 catalog'
    );
  }

  const conflictId = await getActiveEnrichmentRunId();
  if (conflictId !== null) {
    logger.warn(`[v3 Enrichment] Concurrency guard: run #${conflictId} already active.`, {
      conflictId,
    });
    throw Object.assign(
      new Error(
        `An enrichment run (#${conflictId}) is already active. Pause or wait for it to complete.`
      ),
      { status: 409 }
    );
  }

  const run = await createImportRun(
    {
      version: 'v3',
      source,
      searchTerm,
      resultsPerPage: 1,
      pendingItems: pending,
    },
    {
      source,
      api_version: 'v3',
      search_term: searchTerm,
    }
  );

  await setRunTotalItems(run.id, pending);
  void runEnrichmentLoop(run.id, normalizedBssids).catch((error: unknown) => {
    logger.error('[v3 Enrichment] Background run failed to start cleanly', {
      runId: run.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  return run;
}
