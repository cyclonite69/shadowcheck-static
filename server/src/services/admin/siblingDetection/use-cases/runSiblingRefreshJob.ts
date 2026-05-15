import { type SiblingRefreshOptions, type SiblingRefreshResult } from '../../siblingDetectionState';
import { SiblingDetectionOrchestrator } from '../orchestrators/SiblingDetectionOrchestrator';

const orchestrator = new SiblingDetectionOrchestrator();

/**
 * Execute the sibling refresh job synchronously.
 */
async function runSiblingRefreshJob(
  options: SiblingRefreshOptions = {}
): Promise<SiblingRefreshResult> {
  return orchestrator.runRefreshJob(options);
}

export { runSiblingRefreshJob };
