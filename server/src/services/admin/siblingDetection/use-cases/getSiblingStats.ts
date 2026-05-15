import { SIBLING_STATS_SQL } from '../../siblingDetectionQueries';
import { adminQuery } from '../adminQueryAdapter';

/**
 * Return aggregate sibling-pair statistics.
 */
async function getSiblingStats(): Promise<any> {
  const { rows } = await adminQuery(SIBLING_STATS_SQL);
  return rows[0] || {};
}

export { getSiblingStats };
