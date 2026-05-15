import logger from '../../../../logging/logger';
import { adminQuery } from '../adminQueryAdapter';

/**
 * Purge all persisted sibling-pair rows.
 */
async function purgeSiblingPairs(): Promise<{ deleted: number }> {
  const result = await adminQuery('TRUNCATE app.network_sibling_pairs');
  logger.info('[Siblings] Purged all sibling pairs');
  return { deleted: result.rowCount ?? 0 };
}

export { purgeSiblingPairs };
