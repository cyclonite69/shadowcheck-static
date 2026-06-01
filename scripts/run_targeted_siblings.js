// Register ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
  },
});

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const { adminQuery } = require('../server/src/services/admin/siblingDetection/adminQueryAdapter');
const {
  runSiblingRefreshJob,
} = require('../server/src/services/admin/siblingDetectionAdminService');
const { initializeCredentials } = require('../server/src/core/initialization/credentialsInit');

(async () => {
  try {
    console.log('Initializing credentials...');
    await initializeCredentials();

    console.log('Fetching never-scanned BSSIDs...');
    const result = await adminQuery(`
      SELECT bssid 
      FROM app.networks 
      WHERE bssid NOT IN (
        SELECT bssid1 FROM app.network_sibling_pairs
        UNION SELECT bssid2 FROM app.network_sibling_pairs
      )
      ORDER BY bssid
      LIMIT 15000;
    `);

    const bssids = result.rows.map((row) => row.bssid);
    console.log(`Found ${bssids.length} never-scanned BSSIDs.`);

    if (bssids.length === 0) {
      console.log('No never-scanned BSSIDs found. Exiting.');
      return;
    }

    console.log('Starting targeted sibling detection run...');
    const startTime = Date.now();
    const runResult = await runSiblingRefreshJob({
      targetBssids: bssids,
      batchSize: 500,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\nTargeted Run Completed Successfully!');
    console.log(`- Sibling Run ID: ${runResult.sibling_run_id}`);
    console.log(`- Seeds (BSSIDs) Processed: ${runResult.seedsProcessed}`);
    console.log(`- New Sibling Pairs Upserted: ${runResult.rowsUpserted}`);
    console.log(`- Batches Run: ${runResult.batchesRun}`);
    console.log(`- Execution Time: ${duration} seconds`);

    // Get final pair count and rule breakdown
    const statsResult = await adminQuery(`
      SELECT COUNT(*) as total_pairs
      FROM app.network_sibling_pairs
    `);
    console.log(`- Final Total Sibling Pairs: ${statsResult.rows[0].total_pairs}`);

    const ruleBreakdown = await adminQuery(`
      SELECT rule, COUNT(*) as pair_count
      FROM app.network_sibling_pairs
      GROUP BY rule
      ORDER BY pair_count DESC
    `);
    console.log('\nRule Breakdown:');
    ruleBreakdown.rows.forEach((row) => {
      console.log(`  - ${row.rule}: ${row.pair_count}`);
    });
  } catch (err) {
    console.error('Error running targeted sibling detection:', err);
  }
})();
