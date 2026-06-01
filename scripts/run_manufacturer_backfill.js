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

    console.log('Fetching densest OUI groups with unpaired networks...');
    const ouiResult = await adminQuery(`
      SELECT 
        UPPER(REPLACE(SUBSTRING(n.bssid, 1, 8), ':', '')) as oui_clean,
        SUBSTRING(n.bssid, 1, 8) as oui,
        COUNT(*) as count
      FROM app.networks n
      JOIN app.radio_manufacturers rm 
        ON rm.oui = UPPER(REPLACE(SUBSTRING(n.bssid, 1, 8), ':', '')) AND rm.bit_length = 24
      WHERE n.bssid NOT IN (
        SELECT bssid1 FROM app.network_sibling_pairs
        UNION SELECT bssid2 FROM app.network_sibling_pairs
      )
      GROUP BY 1, 2
      ORDER BY count DESC
      LIMIT 100;
    `);

    const ouiGroups = ouiResult.rows;
    console.log(`Found ${ouiGroups.length} OUI groups to process.`);

    let totalNewPairs = 0;
    let totalProcessedBssids = 0;
    let totalBatchesRun = 0;
    const startTime = Date.now();

    // Store pre-sweep sibling run IDs to filter final statistics
    const initialPairsResult = await adminQuery(`
      SELECT COUNT(*)::int as count FROM app.network_sibling_pairs
    `);
    const initialPairsCount = initialPairsResult.rows[0].count;

    console.log(`Starting High-Value Backfill Sweep (Initial pairs: ${initialPairsCount})...\n`);

    for (let i = 0; i < ouiGroups.length; i++) {
      const group = ouiGroups[i];
      console.log(
        `[OUI ${i + 1}/${ouiGroups.length}] Processing OUI ${group.oui} (${group.count} unpaired networks)...`
      );

      // Query BSSIDs for this group
      const bssidsResult = await adminQuery(
        `
        SELECT n.bssid 
        FROM app.networks n
        WHERE SUBSTRING(n.bssid, 1, 8) = $1 
          AND n.bssid NOT IN (
            SELECT bssid1 FROM app.network_sibling_pairs
            UNION SELECT bssid2 FROM app.network_sibling_pairs
          )
        ORDER BY n.bssid;
      `,
        [group.oui]
      );

      const bssids = bssidsResult.rows.map((row) => row.bssid);
      if (bssids.length === 0) {
        console.log(`  - No unpaired BSSIDs found remaining for OUI ${group.oui}. Skipping.`);
        continue;
      }

      // Chunk BSSIDs to safety size (max 800 per call)
      const chunkSize = 800;
      for (let offset = 0; offset < bssids.length; offset += chunkSize) {
        const chunk = bssids.slice(offset, offset + chunkSize);
        console.log(`  - Running targeted job on chunk of ${chunk.length} BSSIDs...`);

        const runResult = await runSiblingRefreshJob({
          targetBssids: chunk,
          batchSize: 500,
          notes: `Manufacturer backfill sweep: OUI = ${group.oui}`,
        });

        totalNewPairs += runResult.rowsUpserted;
        totalProcessedBssids += runResult.seedsProcessed;
        totalBatchesRun += runResult.batchesRun;

        console.log(
          `    * Completed batch. Seeds Processed: ${runResult.seedsProcessed}, Upserted: ${runResult.rowsUpserted}`
        );
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Get final pair count and rule breakdown
    const finalStatsResult = await adminQuery(`
      SELECT COUNT(*)::int as total_pairs
      FROM app.network_sibling_pairs
    `);
    const finalTotalPairs = finalStatsResult.rows[0].total_pairs;

    const ruleBreakdown = await adminQuery(`
      SELECT rule, COUNT(*) as pair_count
      FROM app.network_sibling_pairs
      GROUP BY rule
      ORDER BY pair_count DESC
    `);

    // Find top 10 OUIs that produced new pairs (by checking which OUIs have the most pairs created today)
    const topNewPairsByOui = await adminQuery(`
      SELECT substring(bssid1, 1, 8) as oui, COUNT(*) as pair_count
      FROM app.network_sibling_pairs
      WHERE computed_at >= now() - interval '30 minutes'
      GROUP BY oui
      ORDER BY pair_count DESC
      LIMIT 10;
    `);

    console.log('\n======================================================');
    console.log('HIGH-VALUE BACKFILL SWEEP COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`- Total Legitimate Commercial BSSIDs Processed: ${totalProcessedBssids}`);
    console.log(`- Total New Pairs Created/Updated: ${totalNewPairs}`);
    console.log(`- Total Batches Executed: ${totalBatchesRun}`);
    console.log(`- Sweep Runtime: ${duration} seconds`);
    console.log(`- Initial Sibling Pairs: ${initialPairsCount}`);
    console.log(`- Final Total Sibling Pairs: ${finalTotalPairs}`);
    console.log(`- Net Increase: ${finalTotalPairs - initialPairsCount} pairs`);

    console.log('\nTop 10 OUIs Producing New Pairs:');
    if (topNewPairsByOui.rows.length === 0) {
      console.log('  - No new pairs were written during this run.');
    } else {
      topNewPairsByOui.rows.forEach((row) => {
        console.log(`  - OUI ${row.oui}: ${row.pair_count} pairs`);
      });
    }

    console.log('\nFinal Rule Breakdown across Database:');
    ruleBreakdown.rows.forEach((row) => {
      console.log(`  - ${row.rule}: ${row.pair_count}`);
    });
  } catch (err) {
    console.error('Error running high-value manufacturer backfill sweep:', err);
  }
})();
