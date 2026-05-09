export {};
/**
 * Throwaway test script — run inside the backend container only.
 * Usage: docker exec shadowcheck_backend npx ts-node scripts/runSiblingRefreshTest.ts
 * Do not commit.
 */
const siblingService = require('../server/src/services/admin/siblingDetectionAdminService');
const adminDbService = require('../server/src/services/adminDbService');

async function main() {
  console.log('[test] Starting sibling refresh — batchSize=200, maxBatches=5, minConf=0.70');

  const result = await siblingService.runSiblingRefreshJob({
    batchSize: 200,
    maxBatches: 5,
    minCandidateConf: 0.7,
    incremental: false,
  });

  console.log('[test] Refresh result:', JSON.stringify(result, null, 2));

  const { rows } = await adminDbService.adminQuery(
    `SELECT COUNT(*)::int AS total_pairs,
            COUNT(*) FILTER (WHERE pair_strength = 'strong')::int AS strong,
            COUNT(*) FILTER (WHERE pair_strength = 'candidate')::int AS candidate
     FROM app.network_sibling_pairs`
  );
  console.log('[test] Row counts:', rows[0]);

  await adminDbService.closeAdminPool();
  process.exit(0);
}

main().catch((err) => {
  console.error('[test] Fatal:', err);
  process.exit(1);
});
