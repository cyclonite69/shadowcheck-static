/**
 * WiGLE v3 Enrichment Service
 * Batches v3 detail lookups for existing v2 search results.
 */

const { adminQuery } = require('./adminDbService');
const wigleService = require('./wigleService');
const secretsManager = require('./secretsManager').default;
const logger = require('../logging/logger');
const { withRetry } = require('./externalServiceHandler');
const {
  createImportRun,
  getImportRun,
  markRunControlStatus,
  markRunFailure,
  completeRun,
} = require('./wigleImport/runRepository');

export {};

const ENRICHMENT_DELAY_MS = 1500;
const BATCH_SIZE = 100;

/**
 * Find BSSIDs from v2 search results that lack v3 details
 */
async function getPendingEnrichmentCount(): Promise<number> {
  const sql = `
    SELECT COUNT(DISTINCT v2.bssid)::int AS count
    FROM app.wigle_v2_networks_search v2
    LEFT JOIN app.wigle_v3_network_details v3 ON v3.netid = v2.bssid
    WHERE v3.netid IS NULL
  `;
  const { rows } = await adminQuery(sql);
  return rows[0]?.count || 0;
}

/**
 * Get next batch of BSSIDs to enrich
 */
async function getNextEnrichmentBatch(limit = BATCH_SIZE, manualList?: string[]): Promise<any[]> {
  if (manualList && manualList.length > 0) {
    // For manual runs, we find which of the requested BSSIDs are still missing details
    const sql = `
      SELECT DISTINCT v2.bssid, v2.type
      FROM (SELECT unnest($2::text[]) as bssid) m
      JOIN app.wigle_v2_networks_search v2 ON v2.bssid = m.bssid
      LEFT JOIN app.wigle_v3_network_details v3 ON v3.netid = v2.bssid
      WHERE v3.netid IS NULL
      LIMIT $1
    `;
    const { rows } = await adminQuery(sql, [limit, manualList]);
    return rows;
  }

  const sql = `
    SELECT DISTINCT v2.bssid, v2.type
    FROM app.wigle_v2_networks_search v2
    LEFT JOIN app.wigle_v3_network_details v3 ON v3.netid = v2.bssid
    WHERE v3.netid IS NULL
    LIMIT $1
  `;
  const { rows } = await adminQuery(sql, [limit]);
  return rows;
}

const inferWigleEndpoint = (networkType: string | null | undefined): 'wifi' | 'bt' => {
  const normalized = String(networkType || '')
    .trim()
    .toUpperCase();
  if (normalized === 'B' || normalized === 'E') return 'bt';
  return 'wifi';
};

async function fetchAndImportDetail(bssid: string, type: string) {
  const wigleApiName = secretsManager.get('wigle_api_name');
  const wigleApiToken = secretsManager.get('wigle_api_token');
  if (!wigleApiName || !wigleApiToken) throw new Error('WiGLE API credentials not configured');

  const endpoint = inferWigleEndpoint(type);
  const encodedAuth = Buffer.from(`${wigleApiName}:${wigleApiToken}`).toString('base64');

  const response = await withRetry(
    () =>
      fetch(`https://api.wigle.net/api/v3/detail/${endpoint}/${bssid}`, {
        headers: {
          Authorization: `Basic ${encodedAuth}`,
          Accept: 'application/json',
        },
      }),
    { serviceName: 'WiGLE Batch Enrichment', timeoutMs: 15000, maxRetries: 1 }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WiGLE API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data?.networkId) return null;

  // Import detail
  await wigleService.importWigleV3NetworkDetail({
    netid: data.networkId,
    name: data.name,
    type: data.type,
    comment: data.comment,
    ssid: data.locationClusters?.[0]?.clusterSsid || data.name,
    trilat: data.trilateratedLatitude,
    trilon: data.trilateratedLongitude,
    encryption: data.encryption,
    channel: data.channel,
    first_seen: data.firstSeen,
    last_seen: data.lastSeen,
    last_update: data.lastUpdate,
    street_address: JSON.stringify(data.streetAddress || null),
    location_clusters: JSON.stringify(data.locationClusters || []),
  });

  // Import observations if available
  let obsCount = 0;
  if (Array.isArray(data.locationClusters)) {
    for (const cluster of data.locationClusters) {
      if (!Array.isArray(cluster.locations)) continue;
      for (const loc of cluster.locations) {
        try {
          const inserted = await wigleService.importWigleV3Observation(
            data.networkId,
            loc,
            loc.ssid || cluster.clusterSsid || data.name
          );
          obsCount += inserted;
        } catch (e) {
          // Continue on individual obs failure
        }
      }
    }
  }

  return { bssid, obsCount };
}

async function runEnrichmentLoop(runId: number, manualList?: string[]) {
  let run = await getImportRun(runId);
  if (run.status === 'completed' || run.status === 'cancelled') return run;

  logger.info(
    `[v3 Enrichment] Starting batch loop for run #${runId}${manualList ? ` (Manual: ${manualList.length} items)` : ''}`
  );

  try {
    for (;;) {
      // Re-fetch run to check for pause/cancel
      const { rows } = await adminQuery('SELECT status FROM app.wigle_import_runs WHERE id = $1', [
        runId,
      ]);
      const currentStatus = rows[0]?.status;
      if (currentStatus === 'paused' || currentStatus === 'cancelled') {
        logger.info(`[v3 Enrichment] Loop stopped: ${currentStatus}`);
        return;
      }

      const batch = await getNextEnrichmentBatch(5, manualList);
      if (batch.length === 0) {
        await completeRun(runId);
        logger.info(`[v3 Enrichment] Completed run #${runId}`);
        return;
      }

      for (const item of batch) {
        try {
          await fetchAndImportDetail(item.bssid, item.type);

          // Update progress in run table
          await adminQuery(
            `UPDATE app.wigle_import_runs
             SET rows_inserted = rows_inserted + 1,
                 pages_fetched = pages_fetched + 1,
                 updated_at = NOW()
             WHERE id = $1`,
            [runId]
          );

          await new Promise((resolve) => setTimeout(resolve, ENRICHMENT_DELAY_MS));
        } catch (err: any) {
          if (err.message?.includes('429')) {
            await markRunControlStatus(runId, 'paused');
            logger.warn(`[v3 Enrichment] Rate limited. Pausing run #${runId}`);
            return;
          }
          // Log but continue for other errors
          logger.error(`[v3 Enrichment] Failed item ${item.bssid}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    await markRunFailure(runId, err.message);
    logger.error(`[v3 Enrichment] Fatal loop error: ${err.message}`);
  }
}

async function startBatchEnrichment(bssids?: string[]) {
  const isManual = Array.isArray(bssids) && bssids.length > 0;
  const pending = isManual ? bssids!.length : await getPendingEnrichmentCount();

  if (pending === 0) {
    throw new Error(
      isManual
        ? 'All provided BSSIDs already have v3 details'
        : 'No networks found awaiting v3 enrichment'
    );
  }

  const run = await createImportRun({
    version: 'v3',
    source: isManual ? 'v3_manual' : 'v3_batch',
    searchTerm: isManual
      ? `Manual Enrichment (${pending} items)`
      : `Batch Enrichment (${pending} items)`,
    resultsPerPage: 1,
  });

  // Set total items in api_total_results for progress bar
  await adminQuery('UPDATE app.wigle_import_runs SET api_total_results = $1 WHERE id = $2', [
    pending,
    run.id,
  ]);

  // Start background loop
  void runEnrichmentLoop(run.id, bssids);

  return run;
}

async function resumeEnrichment(runId: number) {
  const { rows } = await adminQuery(
    "UPDATE app.wigle_import_runs SET status = 'running', last_error = NULL WHERE id = $1 RETURNING *",
    [runId]
  );
  if (rows.length === 0) throw new Error('Run not found');

  void runEnrichmentLoop(runId);
  return rows[0];
}

module.exports = {
  getPendingEnrichmentCount,
  startBatchEnrichment,
  resumeEnrichment,
};
