/**
 * Manual Mobile Ingest Trigger
 * Triggers the processing of a mobile upload by ID.
 */
import mobileIngestService from '../server/src/services/mobileIngestService';
import logger from '../server/src/logging/logger';

// In production, we might need to point to dist, but ts-node handles source in dev.
// However, the production container doesn't have server/src.
// Let's use a dynamic import or just standard imports if we're running with ts-node against the source.
// For production container, we should have compiled these scripts or they should point to dist.

async function run() {
  const uploadId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;

  if (isNaN(uploadId)) {
    console.error('Usage: npx ts-node scripts/manual-ingest.ts <uploadId>');
    process.exit(1);
  }

  // Check if we are in production container (no src)
  let service = mobileIngestService;
  let log = logger;

  if (process.env.NODE_ENV === 'production' && !require('fs').existsSync('./server/src')) {
    console.log('Production mode detected, using compiled modules from dist/');
    service = require('../dist/server/server/src/services/mobileIngestService').default;
    log = require('../dist/server/server/src/logging/logger').default;
  }

  log.info(`Manually triggering process for upload ID: ${uploadId}`);
  try {
    await service.processUpload(uploadId);
    log.info(`Successfully triggered process for upload ID: ${uploadId}`);
    process.exit(0);
  } catch (error) {
    log.error(`Failed to process upload ID: ${uploadId}`, { error });
    process.exit(1);
  }
}

run();
