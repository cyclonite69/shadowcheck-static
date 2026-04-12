/**
 * Manual Mobile Ingest Trigger
 * Triggers the processing of a mobile upload by ID.
 */
import mobileIngestService from '../server/src/services/mobileIngestService';
import logger from '../server/src/logging/logger';

const uploadId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;

if (isNaN(uploadId)) {
  console.error('Usage: ts-node scripts/manual-ingest.ts <uploadId>');
  process.exit(1);
}

async function run() {
  logger.info(`Manually triggering process for upload ID: ${uploadId}`);
  try {
    await mobileIngestService.processUpload(uploadId);
    logger.info(`Successfully triggered process for upload ID: ${uploadId}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to process upload ID: ${uploadId}`, { error });
    process.exit(1);
  }
}

run();
