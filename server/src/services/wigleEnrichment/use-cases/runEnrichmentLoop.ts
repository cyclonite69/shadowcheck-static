import { WigleEnrichmentOrchestrator } from '../orchestrators/WigleEnrichmentOrchestrator';

const orchestrator = new WigleEnrichmentOrchestrator();

/**
 * Execute the WiGLE enrichment loop for an existing run.
 */
export const runEnrichmentLoop = async (runId: number, manualList?: string[]) => {
  return orchestrator.run(runId, manualList);
};
