import {
  startSiblingRefresh,
  cancelSiblingRefresh,
  getSiblingRefreshStatus,
  getSiblingRefreshStatusReconciled,
  getSiblingStats,
  getSiblingStatsByRule,
  runSiblingRefreshJob,
  purgeSiblingPairs,
  reconcileSiblingState,
} from '../../../../server/src/services/admin/siblingDetectionAdminService';

describe('siblingDetectionAdminService facade', () => {
  it('should export all required use-cases and state accessors', () => {
    expect(startSiblingRefresh).toBeDefined();
    expect(cancelSiblingRefresh).toBeDefined();
    expect(getSiblingRefreshStatus).toBeDefined();
    expect(getSiblingRefreshStatusReconciled).toBeDefined();
    expect(getSiblingStats).toBeDefined();
    expect(getSiblingStatsByRule).toBeDefined();
    expect(runSiblingRefreshJob).toBeDefined();
    expect(purgeSiblingPairs).toBeDefined();
    expect(reconcileSiblingState).toBeDefined();
  });

  it('should also export via module.exports for CommonJS compatibility', () => {
    const cjs = require('../../../../server/src/services/admin/siblingDetectionAdminService');
    expect(cjs.startSiblingRefresh).toBe(startSiblingRefresh);
    expect(cjs.cancelSiblingRefresh).toBe(cjs.cancelSiblingRefresh);
  });
});
