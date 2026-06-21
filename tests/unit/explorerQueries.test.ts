export {};

import {
  buildExplorerV2Query,
  buildLegacyExplorerQuery,
} from '../../server/src/services/explorerQueries';

describe('explorer query builders', () => {
  it('builds legacy explorer query with search and pagination params', () => {
    const { sql, params } = buildLegacyExplorerQuery({
      homeLon: -73,
      homeLat: 40,
      search: 'home',
      sort: 'ssid',
      order: 'ASC',
      qualityWhere: '',
      limit: 25,
      offset: 50,
    });

    expect(sql).toContain('WITH obs_latest AS');
    expect(sql).toContain('ORDER BY ssid ASC');
    expect(sql).toContain('LIMIT $5 OFFSET $6');
    expect(params).toEqual([-73, 40, '%home%', '%home%', 25, 50]);
  });

  it('builds v2 explorer query with threat ordering and optional pagination', () => {
    const { sql, params } = buildExplorerV2Query({
      search: 'corp',
      sort: 'threat,manufacturer',
      order: 'desc,asc',
      limit: 10,
      offset: 0,
    });

    expect(sql).toContain('FROM app.api_network_explorer_mv mv');
    expect(sql).toContain('jsonb_build_object(');
    expect(sql).toContain('mv.geocoded_address');
    expect(sql).toContain('mv.geocoded_provider');
    expect(sql).toContain('LIMIT $5 OFFSET $6');
    expect(sql).toContain('manufacturer ASC NULLS LAST');
    expect(params).toEqual(['%corp%', '%corp%', '%corp%', '%corp%', 10, 0]);
  });

  it('escapes literal underscore in explorer search terms', () => {
    const { sql, params } = buildExplorerV2Query({
      search: 'x_',
      sort: 'ssid',
      order: 'asc',
      limit: 10,
      offset: 0,
    });

    expect(sql).toContain("ssid ILIKE $1 ESCAPE '\\'");
    expect(params).toEqual(['%x\\_%', '%x\\_%', '%x\\_%', '%x\\_%', 10, 0]);
  });

  it('builds v2 explorer query with stable distance-from-home calculation', () => {
    const { sql } = buildExplorerV2Query({
      search: '',
      sort: 'distance',
      order: 'asc',
      limit: 10,
      offset: 0,
    });

    expect(sql).toContain('WITH home_location AS');
    expect(sql).toContain('mv.weighted_lat IS NOT NULL AND mv.weighted_lon IS NOT NULL');
    expect(sql).toContain('mv.centroid_lat IS NOT NULL AND mv.centroid_lon IS NOT NULL');
    expect(sql).toContain('AS distance_from_home_km');
    expect(sql).toContain('ORDER BY distance_from_home_km ASC NULLS LAST');
  });

  // Branch coverage: buildLegacyExplorerQuery — empty search (if (search) false path)
  it('builds legacy explorer query with empty search — no WHERE clause emitted', () => {
    const { sql, params } = buildLegacyExplorerQuery({
      homeLon: -77,
      homeLat: 38,
      search: '',
      sort: 'ssid',
      order: 'DESC',
      qualityWhere: '',
      limit: 10,
      offset: 0,
    });

    expect(sql).not.toContain('ILIKE');
    // No outer WHERE clause — the CTE's internal WHERE is always present;
    // verify the dynamic outer filter is absent instead
    expect(sql).not.toContain('WHERE (COALESCE');
    expect(sql).toContain('ORDER BY ssid DESC');
    expect(sql).toContain('LIMIT $3 OFFSET $4');
    // No search params pushed — only homeLon, homeLat, limit, offset
    expect(params).toEqual([-77, 38, 10, 0]);
  });

  // Branch coverage: buildLegacyExplorerQuery — limit = null (if (limit !== null) false path)
  it('builds legacy explorer query with limit = null — no LIMIT/OFFSET clause emitted', () => {
    const { sql, params } = buildLegacyExplorerQuery({
      homeLon: -77,
      homeLat: 38,
      search: 'corp',
      sort: 'bssid',
      order: 'ASC',
      qualityWhere: '',
      limit: null,
      offset: 0,
    });

    expect(sql).not.toContain('LIMIT');
    expect(sql).not.toContain('OFFSET');
    // With search: params are [homeLon, homeLat, escapedSearch, escapedSearch]
    expect(params).toEqual([-77, 38, '%corp%', '%corp%']);
  });

  // Branch coverage: buildLegacyExplorerQuery — empty search AND limit = null together
  it('builds legacy explorer query with empty search and limit = null — bare query', () => {
    const { sql, params } = buildLegacyExplorerQuery({
      homeLon: -77,
      homeLat: 38,
      search: '',
      sort: 'ssid',
      order: 'ASC',
      qualityWhere: '',
      limit: null,
      offset: 0,
    });

    // No outer dynamic WHERE or ILIKE — CTE internals still contain WHERE/FROM
    expect(sql).not.toContain('WHERE (COALESCE');
    expect(sql).not.toContain('ILIKE');
    // No pagination clause — verify no parameterised LIMIT
    expect(sql).not.toContain('LIMIT $');
    expect(sql).not.toContain('OFFSET $');
    expect(sql).toContain('WITH obs_latest AS');
    expect(sql).toContain('ORDER BY ssid ASC');
    // Only homeLon and homeLat in params
    expect(params).toEqual([-77, 38]);
  });

  // Branch coverage: buildExplorerV2Query — limit = null (both false-branch sides)
  it('builds v2 explorer query with limit = null — no LIMIT/OFFSET emitted, no pagination params', () => {
    const { sql, params } = buildExplorerV2Query({
      search: 'test',
      sort: 'ssid',
      order: 'asc',
      limit: null,
      offset: 0,
    });

    // home_location CTE always contains 'LIMIT 1'; check no parameterised pagination LIMIT
    expect(sql).not.toContain('LIMIT $');
    expect(sql).not.toContain('OFFSET $');
    // Four search params pushed (ssid, bssid, manufacturer, manufacturer_address), no limit/offset
    expect(params).toEqual(['%test%', '%test%', '%test%', '%test%']);
  });
});
