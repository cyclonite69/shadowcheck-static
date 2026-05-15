import { SIBLING_STATS_BY_RULE_SQL } from '../../siblingDetectionQueries';
import { adminQuery } from '../adminQueryAdapter';

/**
 * Return sibling-pair counts grouped by rule.
 */
async function getSiblingStatsByRule(): Promise<any[]> {
  const { rows } = await adminQuery(SIBLING_STATS_BY_RULE_SQL);
  return rows;
}

export { getSiblingStatsByRule };
