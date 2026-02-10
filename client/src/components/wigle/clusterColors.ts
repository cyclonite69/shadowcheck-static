/**
 * WiGLE Cluster Colors Utility
 * Handles cluster color generation and caching
 */

import { dominantClusterColor } from '../../utils/wigle';

export function createClusterColorCache() {
  return { v2: {}, v3: {} } as Record<string, Record<number, string>>;
}

export function updateClusterColors(
  map: any,
  sourceId: string,
  cacheKey: 'v2' | 'v3',
  cache: Record<string, Record<number, string>>
) {
  if (!map) return;

  const source = map.getSource(sourceId);
  if (!source) return;

  const features = map.querySourceFeatures(sourceId, {
    sourceLayer: undefined,
    filter: ['has', 'point_count'],
  });

  features.forEach((feature: any) => {
    const clusterId = feature.properties.cluster_id;
    if (!clusterId || cache[cacheKey][clusterId]) return;

    source.getClusterLeaves(clusterId, 100, 0, (err: any, leaves: any[]) => {
      if (err || !leaves) return;
      const color = dominantClusterColor(leaves);
      cache[cacheKey][clusterId] = color;
    });
  });
}

export function updateAllClusterColors(map: any, cache: Record<string, Record<number, string>>) {
  if (!map) return;
  updateClusterColors(map, 'wigle-v2', 'v2', cache);
  updateClusterColors(map, 'wigle-v3', 'v3', cache);
}
