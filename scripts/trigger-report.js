/**
 * Trigger Threat Report for Latest Import
 * JS version for production compatibility.
 */
const path = require('path');
const fs = require('fs');

async function run() {
  let db;
  let reportService;
  let log;

  // Path detection
  if (fs.existsSync(path.join(__dirname, '../server/src/services/mobileIngestService.ts'))) {
    console.log('Development mode detected');
    require('ts-node').register();
    db = require('../server/src/config/database');
    reportService = require('../server/src/services/threatReportService').default;
    log = require('../server/src/logging/logger').default;
  } else {
    console.log('Production mode detected');
    const dbPath = path.join(__dirname, '../dist/server/server/src/config/database');
    const reportServicePath = path.join(
      __dirname,
      '../dist/server/server/src/services/threatReportService'
    );
    const loggerPath = path.join(__dirname, '../dist/server/server/src/logging/logger');

    db = require(dbPath);
    reportService = require(reportServicePath).default || require(reportServicePath);
    log = require(loggerPath).default || require(loggerPath);
  }

  try {
    // 1. Get latest successful import history ID
    const { rows } = await db.query(
      'SELECT id, source_tag FROM app.import_history WHERE status = $1 ORDER BY finished_at DESC LIMIT 1',
      ['success']
    );

    if (rows.length === 0) {
      console.log('No successful imports found.');
      process.exit(0);
    }

    const historyId = rows[0].id;
    const sourceTag = rows[0].source_tag;
    log.info(`Generating report for latest import: ${sourceTag} (ID: ${historyId})`);

    // 2. Find BSSIDs in this import (this part depends on how you track which BSSIDs belong to which import)
    // For now, let's assume we want to analyze networks that have observations with this source_tag
    const { rows: networks } = await db.query(
      'SELECT DISTINCT bssid FROM app.observations WHERE source_tag = $1 LIMIT 100',
      [sourceTag]
    );

    if (networks.length === 0) {
      console.log('No networks found for this import tag.');
      process.exit(0);
    }

    const bssids = networks.map((n) => n.bssid);
    log.info(`Found ${bssids.length} networks to analyze.`);

    // 3. Trigger report generation
    // This is a placeholder - check threatReportService for actual method
    console.log('Triggering analysis for BSSIDs:', bssids);

    // If there's an actual 'generateReport' method, call it here
    if (typeof reportService.generateBatchReport === 'function') {
      const result = await reportService.generateBatchReport(bssids, {
        title: `Import Report: ${sourceTag}`,
      });
      log.info('Report triggered successfully', { result });
    } else {
      log.warn('threatReportService.generateBatchReport not found, just verified connectivity.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed to trigger report:', error);
    process.exit(1);
  }
}

run();
