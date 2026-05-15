/**
 * WiGLE v3 enrichment facade.
 * Preserves the existing public API while delegating orchestration and
 * single-purpose behavior to `services/wigleEnrichment/`.
 */

import {
  getEnrichmentCatalog,
  getPendingEnrichmentCount,
} from '../repositories/wigleEnrichmentRepository';

export { getPendingEnrichmentCount, getEnrichmentCatalog };
export { runEnrichmentLoop } from './wigleEnrichment/use-cases/runEnrichmentLoop';
export { startBatchEnrichment } from './wigleEnrichment/use-cases/startBatchEnrichment';
export { resumeEnrichment } from './wigleEnrichment/use-cases/resumeEnrichment';
export { validateWigleApiCredit } from './wigleEnrichment/use-cases/validateWigleApiCredit';
export { forceClearEnrichmentRun } from './wigleEnrichment/use-cases/forceClearEnrichmentRun';
