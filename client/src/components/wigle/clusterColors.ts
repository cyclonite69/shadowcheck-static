import type mapboxglType from 'mapbox-gl';
import { dominantClusterColor, CLUSTER_SAMPLE_LIMIT } from '../../utils/wigle';

export const updateClusterColors = (
  map: mapboxglType.Map,
  sourceId: string,
  cacheKey: 'v2' | 'v3',
  clusterColorCache: React.MutableRefObject<Record<string, Record<number, string>>>
) => {
  const source = map.getSource(sourceId) as mapboxglType.GeoJSONSource | undefined;
  if (!source) return;

  const clusterLayerId = sourceId === 'wigle-v2-points' ? 'wigle-v2-clusters' : 'wigle-v3-clusters';
  const clusters = map.querySourceFeatures(sourceId, { filter: ['has', 'point_count'] });

  clusters.forEach((feature) => {
    const clusterId = feature.properties?.cluster_id;
    const featureId = feature.id ?? clusterId;
    if (clusterId == null || featureId == null) return;

    const cached = clusterColorCache.current[cacheKey]?.[clusterId];
    if (cached) {
      map.setFeatureState({ source: sourceId, id: featureId }, { color: cached });
      return;
    }

    source.getClusterLeaves(clusterId, CLUSTER_SAMPLE_LIMIT, 0, (err, leaves) => {
      if (err || !leaves || leaves.length === 0) return;
      const bssids = leaves.map((leaf) => String(leaf.properties?.bssid || '')).filter(Boolean);
      const color = dominantClusterColor(bssids);
      if (!clusterColorCache.current[cacheKey]) clusterColorCache.current[cacheKey] = {};
      clusterColorCache.current[cacheKey][clusterId] = color;
      map.setFeatureState({ source: sourceId, id: featureId }, { color });
    });
  });
};

export const updateAllClusterColors = (
  map: mapboxglType.Map,
  clusterColorCache: React.MutableRefObject<Record<string, Record<number, string>>>
) => {
  updateClusterColors(map, 'wigle-v2-points', 'v2', clusterColorCache);
  updateClusterColors(map, 'wigle-v3-points', 'v3', clusterColorCache);
};
