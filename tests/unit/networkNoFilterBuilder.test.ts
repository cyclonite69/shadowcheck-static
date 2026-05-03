export {};

import { FilterBuildContext } from '../../server/src/services/filterQueryBuilder/FilterBuildContext';
import {
  buildNetworkNoFilterListQuery,
  buildNetworkNoFilterCountQuery,
} from '../../server/src/services/filterQueryBuilder/modules/networkNoFilterBuilder';

function makeCtx(filters: Record<string, unknown> = {}, enabled: Record<string, unknown> = {}) {
  return new FilterBuildContext(filters, enabled);
}

describe('buildNetworkNoFilterListQuery — orderBy alias rewriting', () => {
  test('rewrites legacy l.observed_at to ne.observed_at', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx, { orderBy: 'l.observed_at DESC' });
    expect(sql).toContain('ne.observed_at DESC');
    expect(sql).not.toContain('l.observed_at');
  });

  test('rewrites l.level to ne.signal', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx, { orderBy: 'l.level ASC' });
    expect(sql).toContain('ne.signal ASC');
    expect(sql).not.toContain('l.level');
  });

  test('rewrites r.observation_count to ne.observations', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx, { orderBy: 'r.observation_count DESC' });
    expect(sql).toContain('ne.observations DESC');
    expect(sql).not.toContain('r.observation_count');
  });

  test('rewrites r.first_observed_at and r.last_observed_at', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx, {
      orderBy: 'r.first_observed_at ASC, r.last_observed_at DESC',
    });
    expect(sql).toContain('ne.first_seen ASC');
    expect(sql).toContain('ne.last_seen DESC');
  });

  test('rewrites s.stationary_confidence to ne.stationary_confidence', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx, {
      orderBy: 's.stationary_confidence DESC',
    });
    expect(sql).toContain('ne.stationary_confidence DESC');
    expect(sql).not.toContain('s.stationary_confidence');
  });

  test('passes through already-canonical orderBy unchanged', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx, { orderBy: 'ne.threat_score DESC' });
    expect(sql).toContain('ne.threat_score DESC');
  });
});

describe('buildNetworkNoFilterListQuery — includeIgnored branch', () => {
  test('excludes ignored networks by default (no tag filter)', () => {
    const ctx = makeCtx();
    const { sql } = buildNetworkNoFilterListQuery(ctx);
    expect(sql).toContain('COALESCE(nt.is_ignored, FALSE) = FALSE');
  });

  test('omits ignored-exclusion clause when tag filter explicitly includes ignored', () => {
    // tag_type: ['ignore'] signals the user wants to see ignored networks
    const ctx = makeCtx({ tag_type: ['ignore'] }, { tag_type: true });
    const { sql } = buildNetworkNoFilterListQuery(ctx);
    expect(sql).not.toContain('COALESCE(nt.is_ignored, FALSE) = FALSE');
  });
});

describe('buildNetworkNoFilterCountQuery', () => {
  test('returns fast stats-based count query by default', () => {
    const ctx = makeCtx();
    const { sql, params } = buildNetworkNoFilterCountQuery(ctx);
    expect(sql).toContain('reltuples');
    expect(params).toEqual([]);
  });

  test('returns simple COUNT(*) when tag filter includes ignored', () => {
    const ctx = makeCtx({ tag_type: ['ignore'] }, { tag_type: true });
    const { sql, params } = buildNetworkNoFilterCountQuery(ctx);
    expect(sql).toContain('COUNT(*)');
    expect(sql).not.toContain('reltuples');
    expect(params).toEqual([]);
  });
});
