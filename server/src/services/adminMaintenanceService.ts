import { adminQuery } from './adminDbService';
import { query } from '../config/database';
import logger from '../logging/logger';

export async function getDuplicateObservationStats(): Promise<{
  total: number;
  unique_obs: number;
}> {
  const result = await query(`
    SELECT COUNT(*) as total,
           COUNT(DISTINCT (bssid, observed_at, lat, lon, accuracy)) as unique_obs
    FROM app.observations
    WHERE lat IS NOT NULL AND lon IS NOT NULL
  `);
  return result.rows[0] || { total: 0, unique_obs: 0 };
}

export async function deleteDuplicateObservations(): Promise<number> {
  const result = await adminQuery(`
    DELETE FROM app.observations
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY bssid, observed_at, lat, lon, accuracy 
            ORDER BY id
          ) as rn
        FROM app.observations
        WHERE lat IS NOT NULL AND lon IS NOT NULL
      ) t
      WHERE rn > 1
    )
  `);
  return result.rowCount || 0;
}

export async function getObservationCount(): Promise<number> {
  const result = await query(`
    SELECT COUNT(*) as total
    FROM app.observations
    WHERE lat IS NOT NULL AND lon IS NOT NULL
  `);
  return parseInt(result.rows[0]?.total || '0', 10);
}

// DEPRECATED: Generic network cooccurrence is superseded by sibling
// detection. This will be removed or redesigned. Do not restore the
// SQL body without an explicit architectural decision.
export async function refreshColocationView(_minValidTimestamp?: number): Promise<void> {
  logger.warn(
    'refreshColocationView: deprecated — pending redesign as part ' +
      'of sibling detection system evolution. Skipping.'
  );
  return;
}

/**
 * Truncate all data (dangerous admin operation)
 */
export async function truncateAllData(): Promise<void> {
  await adminQuery('TRUNCATE TABLE app.observations CASCADE');
  await adminQuery('TRUNCATE TABLE app.networks CASCADE');
}
