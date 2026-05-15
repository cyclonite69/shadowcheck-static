import { bulkDeleteCancelledRunsByIds, findGlobalCancelledClusterIds } from '../runRepository';

/**
 * Delete the globally-cancelled run cluster identified by its shared fingerprint.
 */
export const bulkDeleteGlobalCancelledCluster = async (): Promise<number> => {
  const ids = await findGlobalCancelledClusterIds();
  if (ids.length === 0) {
    return 0;
  }
  return bulkDeleteCancelledRunsByIds(ids);
};
