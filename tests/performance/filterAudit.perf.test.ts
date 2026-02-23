export {};

import { UniversalFilterQueryBuilder } from '../../server/src/services/filterQueryBuilder';

describe('Filter performance harness (query build baseline)', () => {
  test('high-risk filters generate query within baseline budget', () => {
    const start = Date.now();

    const result = new UniversalFilterQueryBuilder(
      {
        radioTypes: ['W'],
        frequencyBands: ['5GHz'],
        tag_type: ['threat', 'ignore'],
        has_notes: true,
        radiusFilter: { latitude: 40.7, longitude: -73.9, radiusMeters: 3000 },
        distanceFromHomeMin: 1,
        threatCategories: ['critical'],
      },
      {
        radioTypes: true,
        frequencyBands: true,
        tag_type: true,
        has_notes: true,
        radiusFilter: true,
        distanceFromHomeMin: true,
        threatCategories: true,
      },
      { pageType: 'wigle' }
    ).buildGeospatialQuery({ limit: 10000, offset: 0 });

    const elapsedMs = Date.now() - start;

    expect(result.sql.length).toBeGreaterThan(0);
    expect(result.params.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(200);
  });

  test('documents SQL profiling command', () => {
    const result = new UniversalFilterQueryBuilder(
      { radioTypes: ['W'] },
      { radioTypes: true }
    ).buildNetworkListQuery();

    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${result.sql}`;
    expect(explainSql).toContain('EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)');
  });
});
