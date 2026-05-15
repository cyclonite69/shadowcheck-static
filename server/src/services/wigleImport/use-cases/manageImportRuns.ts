import { getImportRun } from '../runRepository';
import {
  cancelRun,
  findLatestResumable,
  initializeImportRun,
  pauseRun,
  prepareRunForResumption,
} from '../runStateManager';
import { WigleImportRunOrchestrator } from '../orchestrators/WigleImportRunOrchestrator';

const orchestrator = new WigleImportRunOrchestrator();

/**
 * Start a new WiGLE import run and execute its page loop immediately.
 */
export const startImportRun = async (rawQuery: Record<string, unknown>) => {
  const run = await initializeImportRun(rawQuery);
  const finalRun = await orchestrator.execute(Number(run.id));
  return getImportRun(Number(finalRun.id));
};

/**
 * Resume an existing persisted WiGLE import run.
 */
export const resumeImportRun = async (runId: number) => {
  await prepareRunForResumption(runId);
  const finalRun = await orchestrator.execute(runId);
  return getImportRun(Number(finalRun.id));
};

/**
 * Resume the latest resumable run for the same query, or start a new run.
 */
export const resumeLatestImportRun = async (rawQuery: Record<string, unknown>) => {
  const latest = await findLatestResumable(rawQuery);
  if (!latest) {
    return startImportRun(rawQuery);
  }
  return resumeImportRun(Number(latest.id));
};

/**
 * Find the latest resumable run for a query without mutating it.
 */
export const getLatestResumableImportRun = async (rawQuery: Record<string, unknown>) => {
  return findLatestResumable(rawQuery);
};

/**
 * Pause a running import.
 */
export const pauseImportRun = async (runId: number) => {
  return pauseRun(runId);
};

/**
 * Cancel a running or resumable import.
 */
export const cancelImportRun = async (runId: number) => {
  return cancelRun(runId);
};
