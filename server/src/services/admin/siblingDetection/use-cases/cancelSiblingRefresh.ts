import { state } from '../../siblingDetectionState';
import { adminQuery } from '../adminQueryAdapter';
import { reconcileSiblingState } from './reconcileSiblingState';

/**
 * Cancel a running sibling refresh or clear stale persisted running rows.
 */
async function cancelSiblingRefresh(): Promise<{ accepted: boolean; message: string }> {
  await reconcileSiblingState();

  const dbUpdates: string[] = [];

  if (state.running) {
    state.cancelRequested = true;
    dbUpdates.push('in-memory job cancelled');
  }

  const bgJobResult = await adminQuery(
    `UPDATE app.background_job_runs SET status = $1, finished_at = now(), error = $2
     WHERE job_name = $3 AND status = $4 RETURNING id`,
    ['failed', 'Cancelled by operator', 'siblingDetection', 'running']
  );
  if (bgJobResult.rowCount && bgJobResult.rowCount > 0) {
    dbUpdates.push(`background_job_runs updated (${bgJobResult.rowCount} row)`);
  }

  const siblingResult = await adminQuery(
    `UPDATE app.sibling_runs SET status = $1, completed_at = now()
     WHERE status = $2 RETURNING id`,
    ['failed', 'running']
  );
  if (siblingResult.rowCount && siblingResult.rowCount > 0) {
    dbUpdates.push(`sibling_runs updated (${siblingResult.rowCount} row)`);
  }

  if (state.running || dbUpdates.length > 1) {
    return {
      accepted: true,
      message: `Job cancelled. Updates: ${dbUpdates.join(', ')}`,
    };
  }

  return { accepted: false, message: 'No job is currently running' };
}

export { cancelSiblingRefresh };
