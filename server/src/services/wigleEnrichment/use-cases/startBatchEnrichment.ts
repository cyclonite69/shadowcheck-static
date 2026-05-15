import logger from '../../../logging/logger';
import {
  getActiveEnrichmentRunId,
  getPendingEnrichmentCount,
  setRunTotalItems,
} from '../../../repositories/wigleEnrichmentRepository';
import { createImportRun } from '../../wigleImport/runRepository';
import { runEnrichmentLoop } from './runEnrichmentLoop';

/**
 * Start a new WiGLE enrichment run, either full-catalog or targeted.
 */
export async function startBatchEnrichment(bssids?: string[]) {
  const isManual = Array.isArray(bssids) && bssids.length > 0;
  const source = isManual ? 'v3_manual' : 'v3_batch';
  const searchTerm = isManual
    ? `Targeted Enrichment (${bssids!.length} items)`
    : 'Full Catalog Enrichment';

  const pending = isManual ? bssids!.length : await getPendingEnrichmentCount();
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
  void runEnrichmentLoop(run.id, bssids).catch((error: unknown) => {
    logger.error('[v3 Enrichment] Background run failed to start cleanly', {
      runId: run.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  return run;
}
