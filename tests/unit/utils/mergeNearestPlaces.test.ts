export {};

import { mergeNearestPlaces } from '../../../client/src/utils/geospatial/mergeNearestPlaces';
import type { Agency } from '../../../client/src/components/geospatial/hooks/useNearestAgencies';
import type { CourthouseMatch } from '../../../client/src/api/agencyApi';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const agencyMI: Agency = {
  cluster_id: 0,
  cluster_count: 149,
  cluster_lat: 43.01,
  cluster_lon: -83.69,
  has_wigle_obs: false,
  has_local_obs: true,
  name: 'Flint Resident Agency',
  office_type: 'resident_agency',
  city: 'Flint',
  state: 'MI',
  postal_code: '48503',
  latitude: 43.01,
  longitude: -83.69,
  distance_meters: 312,
};

const agencyFL: Agency = {
  cluster_id: 1,
  cluster_count: 42,
  cluster_lat: 25.94,
  cluster_lon: -80.19,
  has_wigle_obs: true,
  has_local_obs: false,
  name: 'Miami Field Office',
  office_type: 'field_office',
  city: 'Miami',
  state: 'FL',
  postal_code: '33169',
  latitude: 25.94,
  longitude: -80.19,
  distance_meters: 27900,
};

const agencyCA: Agency = {
  cluster_id: 2,
  cluster_count: 1,
  cluster_lat: 37.77,
  cluster_lon: -122.41,
  has_wigle_obs: true,
  has_local_obs: false,
  name: 'San Francisco Field Office',
  office_type: 'field_office',
  city: 'San Francisco',
  state: 'CA',
  postal_code: '94102',
  latitude: 37.78,
  longitude: -122.41,
  distance_meters: 1100,
};

const courthouseMI: CourthouseMatch = {
  cluster_id: 0,
  cluster_count: 149,
  cluster_lat: 43.01,
  cluster_lon: -83.69,
  has_wigle_obs: false,
  has_local_obs: true,
  id: 101,
  name: 'Theodore Levin United States Courthouse',
  short_name: 'Levin Courthouse',
  courthouse_type: 'district_court',
  district: 'Eastern District of Michigan',
  circuit: 'Sixth Circuit',
  city: 'Detroit',
  state: 'MI',
  postal_code: '48226',
  latitude: 42.33,
  longitude: -83.05,
  distance_meters: 1400,
};

const courthouseFL: CourthouseMatch = {
  cluster_id: 1,
  cluster_count: 42,
  cluster_lat: 25.94,
  cluster_lon: -80.19,
  has_wigle_obs: true,
  has_local_obs: false,
  id: 202,
  name: 'Wilkie D. Ferguson Jr. United States Courthouse',
  short_name: 'Ferguson Courthouse',
  courthouse_type: 'district_court',
  district: 'Southern District of Florida',
  circuit: 'Eleventh Circuit',
  city: 'Miami',
  state: 'FL',
  postal_code: '33128',
  latitude: 25.77,
  longitude: -80.19,
  distance_meters: 2600,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mergeNearestPlaces', () => {
  test('combines agency + courthouse with same cluster_id into one item', () => {
    const result = mergeNearestPlaces([agencyMI], [courthouseMI]);
    expect(result).toHaveLength(1);
    expect(result[0].clusterId).toBe(0);
    expect(result[0].agency).toBeDefined();
    expect(result[0].courthouse).toBeDefined();
    expect(result[0].agency!.name).toBe('Flint Resident Agency');
    expect(result[0].courthouse!.name).toBe('Theodore Levin United States Courthouse');
  });

  test('agency-only produces one item with agency set and courthouse undefined', () => {
    const result = mergeNearestPlaces([agencyMI], []);
    expect(result).toHaveLength(1);
    expect(result[0].agency).toBeDefined();
    expect(result[0].courthouse).toBeUndefined();
  });

  test('courthouse-only produces one item with courthouse set and agency undefined', () => {
    const result = mergeNearestPlaces([], [courthouseMI]);
    expect(result).toHaveLength(1);
    expect(result[0].courthouse).toBeDefined();
    expect(result[0].agency).toBeUndefined();
  });

  test('multiple clusters (MI + FL) merge correctly to two items', () => {
    const result = mergeNearestPlaces([agencyMI, agencyFL], [courthouseMI, courthouseFL]);
    expect(result).toHaveLength(2);
    expect(result[0].clusterId).toBe(0);
    expect(result[1].clusterId).toBe(1);
    expect(result[0].agency!.city).toBe('Flint');
    expect(result[1].courthouse!.city).toBe('Miami');
  });

  test('western singleton cluster (CA) is preserved alongside MI + FL', () => {
    const result = mergeNearestPlaces([agencyMI, agencyFL, agencyCA], [courthouseMI, courthouseFL]);
    expect(result).toHaveLength(3);
    const caCluster = result.find((c) => c.clusterId === 2);
    expect(caCluster).toBeDefined();
    expect(caCluster!.agency!.city).toBe('San Francisco');
    expect(caCluster!.courthouse).toBeUndefined();
    expect(caCluster!.observationCount).toBe(1);
  });

  test('singleton cluster (cluster_count: 1) is not dropped', () => {
    const result = mergeNearestPlaces([agencyCA], []);
    expect(result).toHaveLength(1);
    expect(result[0].observationCount).toBe(1);
    expect(result[0].clusterId).toBe(2);
  });

  test('empty inputs return empty array', () => {
    expect(mergeNearestPlaces([], [])).toEqual([]);
  });

  test('cluster centroid lat/lon comes from agency cluster_lat/cluster_lon', () => {
    const result = mergeNearestPlaces([agencyMI], [courthouseMI]);
    expect(result[0].clusterLat).toBeCloseTo(43.01, 2);
    expect(result[0].clusterLon).toBeCloseTo(-83.69, 2);
  });

  test('courthouse-only cluster uses courthouse cluster_lat/cluster_lon', () => {
    const result = mergeNearestPlaces([], [courthouseFL]);
    expect(result[0].clusterLat).toBeCloseTo(25.94, 2);
    expect(result[0].clusterLon).toBeCloseTo(-80.19, 2);
  });

  test('cluster with missing cluster_lat falls back to place latitude', () => {
    const agencyNoClusterCoords: Agency = {
      ...agencyMI,
      cluster_lat: undefined,
      cluster_lon: undefined,
    };
    const result = mergeNearestPlaces([agencyNoClusterCoords], []);
    // Falls back to agency.latitude
    expect(result[0].clusterLat).toBeCloseTo(43.01, 2);
  });

  test('result is sorted by cluster_id ascending, synthetic keys last', () => {
    // Agencies without cluster_id get synthetic keys
    const agNoId: Agency = { ...agencyMI, cluster_id: undefined };
    const result = mergeNearestPlaces([agencyFL, agencyMI, agNoId], []);
    // Cluster 0 and 1 come before synthetic
    expect(result[0].clusterId).toBe(0);
    expect(result[1].clusterId).toBe(1);
    expect(result[2].clusterId).toBeNull();
  });

  test('source flags are merged: courthouse wigle flag ORed into cluster', () => {
    // Agency cluster has no WiGLE, courthouse cluster says yes WiGLE
    const agencyLocalOnly = { ...agencyMI, has_wigle_obs: false };
    const courthouseWigle = { ...courthouseMI, has_wigle_obs: true };
    const result = mergeNearestPlaces([agencyLocalOnly], [courthouseWigle]);
    expect(result[0].hasWigleObs).toBe(true);
  });

  test('cluster with no agency or courthouse match is still preserved', () => {
    const agencyNoMatch: Agency = {
      cluster_id: 9,
      cluster_count: 1,
      cluster_lat: 47.6,
      cluster_lon: -122.3,
      has_wigle_obs: true,
      has_local_obs: false,
      name: null,
      latitude: null,
      longitude: null,
    };
    const courthouseNoMatch: CourthouseMatch = {
      cluster_id: 9,
      cluster_count: 1,
      cluster_lat: 47.6,
      cluster_lon: -122.3,
      has_wigle_obs: true,
      has_local_obs: false,
      id: null,
      name: null,
      latitude: null,
      longitude: null,
    };

    const result = mergeNearestPlaces([agencyNoMatch], [courthouseNoMatch]);

    expect(result).toHaveLength(1);
    expect(result[0].clusterId).toBe(9);
    expect(result[0].agency).toBeUndefined();
    expect(result[0].courthouse).toBeUndefined();
    expect(result[0].observationCount).toBe(1);
    expect(result[0].hasWigleObs).toBe(true);
  });
});
