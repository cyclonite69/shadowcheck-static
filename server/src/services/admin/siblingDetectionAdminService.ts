import { getSiblingRefreshStatus } from './siblingDetectionState';
import { cancelSiblingRefresh } from './siblingDetection/use-cases/cancelSiblingRefresh';
import { getSiblingRefreshStatusReconciled } from './siblingDetection/use-cases/getSiblingRefreshStatusReconciled';
import { getSiblingStats } from './siblingDetection/use-cases/getSiblingStats';
import { getSiblingStatsByRule } from './siblingDetection/use-cases/getSiblingStatsByRule';
import { purgeSiblingPairs } from './siblingDetection/use-cases/purgeSiblingPairs';
import { reconcileSiblingState } from './siblingDetection/use-cases/reconcileSiblingState';
import { runSiblingRefreshJob } from './siblingDetection/use-cases/runSiblingRefreshJob';
import { startSiblingRefresh } from './siblingDetection/use-cases/startSiblingRefresh';

/**
 * Sibling detection admin facade.
 * Keeps the public API stable while delegating work to focused orchestrators and use-cases.
 */
module.exports = {
  startSiblingRefresh,
  cancelSiblingRefresh,
  getSiblingRefreshStatus,
  getSiblingRefreshStatusReconciled,
  getSiblingStats,
  getSiblingStatsByRule,
  runSiblingRefreshJob,
  purgeSiblingPairs,
  reconcileSiblingState,
};

export {
  startSiblingRefresh,
  cancelSiblingRefresh,
  getSiblingRefreshStatus,
  getSiblingRefreshStatusReconciled,
  getSiblingStats,
  getSiblingStatsByRule,
  runSiblingRefreshJob,
  purgeSiblingPairs,
  reconcileSiblingState,
};
