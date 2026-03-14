import { UniversalFilterQueryBuilder } from '../../server/src/services/filterQueryBuilder/universalFilterQueryBuilder';

describe('Systematic Filter Logic Audit', () => {
  const testFilter = (name: string, filters: any, enabled: any) => {
    const builder = new UniversalFilterQueryBuilder(filters, enabled);

    // 1. Check Dashboard path (NetworkRepository logic uses buildNetworkListQuery or buildGeospatialQuery)
    const listQuery = builder.buildNetworkListQuery();
    const geospatialQuery = builder.buildGeospatialQuery();

    // 2. Check Analytics path
    const analyticsQueries = builder.buildAnalyticsQueries({ useLatestPerBssid: true });

    return {
      listSql: listQuery.sql,
      geoSql: geospatialQuery.sql,
      analyticsSql: analyticsQueries.networkTypes.sql,
      applied: listQuery.appliedFilters.map((f: any) => f.field),
    };
  };

  test('radioTypes filter is applied to all paths', () => {
    const { listSql, geoSql, analyticsSql, applied } = testFilter(
      'radioTypes',
      { radioTypes: ['W', 'L'] },
      { radioTypes: true }
    );

    expect(listSql).toContain('ne.type = ANY(');
    // In complex paths, it uses the OBS_TYPE_EXPR which is a long CASE statement
    expect(geoSql).toContain('CASE');
    expect(geoSql).toContain("IN ('W', 'WIFI', 'WI-FI')");
    expect(geoSql).toContain('= ANY(');

    expect(analyticsSql).toContain('CASE');
    expect(analyticsSql).toContain('= ANY(');
    expect(applied).toContain('radioTypes');
  });

  test('threatCategories filter is applied to all paths', () => {
    const { listSql, geoSql, analyticsSql, applied } = testFilter(
      'threatCategories',
      { threatCategories: ['critical', 'medium'] },
      { threatCategories: true }
    );

    // Fast path uses ne.threat_level directly
    expect(listSql).toContain('ne.threat_level = ANY(');
    // Geospatial also joins against MV for speed
    expect(geoSql).toContain('ne.threat_level = ANY(');
    expect(analyticsSql).toContain('ne.threat_level = ANY(');
    expect(applied).toContain('threatCategories');
  });

  test('timeframe filter is applied to all paths', () => {
    const { listSql, geoSql, analyticsSql, applied } = testFilter(
      'timeframe',
      { timeframe: { type: 'relative', relativeWindow: '7d' } },
      { timeframe: true }
    );

    expect(listSql).toContain('ne.last_seen >= NOW() -');
    expect(geoSql).toContain('o.time >= NOW() -');
    expect(analyticsSql).toContain('o.time >= NOW() -');
    expect(applied).toContain('timeframe');
  });
});
