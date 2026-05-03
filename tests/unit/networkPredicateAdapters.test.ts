export {};

import { FilterBuildContext } from '../../server/src/services/filterQueryBuilder/FilterBuildContext';
import {
  applyRadioFilters,
  applyEngagementFilters,
} from '../../server/src/services/filterQueryBuilder/modules/networkPredicateAdapters';

describe('applyRadioFilters', () => {
  test('returns WHERE clauses and forwards applied filters to context', () => {
    const ctx = new FilterBuildContext(
      { radioTypes: ['W', 'E'], channelMin: 1, channelMax: 6 },
      { radioTypes: true, channelMin: true, channelMax: true }
    );

    const where = applyRadioFilters(ctx, {
      typeExpr: 'ne.type',
      frequencyExpr: 'ne.frequency',
      channelExpr: 'ne.channel',
      signalExpr: 'ne.signal',
    });

    expect(where.length).toBeGreaterThan(0);
    const appliedFields = ctx.getAppliedFilters().map((e) => e.field);
    expect(appliedFields).toContain('radioTypes');
    expect(appliedFields).toContain('channelMin');
    expect(appliedFields).toContain('channelMax');
  });

  test('returns empty array and records no applied filters when no radio filters enabled', () => {
    const ctx = new FilterBuildContext({}, {});
    const where = applyRadioFilters(ctx, {
      typeExpr: 'ne.type',
      frequencyExpr: 'ne.frequency',
      channelExpr: 'ne.channel',
      signalExpr: 'ne.signal',
    });

    expect(where).toEqual([]);
    expect(ctx.getAppliedFilters()).toEqual([]);
  });

  test('RSSI filter uses provided signalExpr in generated SQL', () => {
    const ctx = new FilterBuildContext({ rssiMin: -80 }, { rssiMin: true });
    const where = applyRadioFilters(ctx, {
      typeExpr: 'ne.type',
      frequencyExpr: 'ne.frequency',
      channelExpr: 'ne.channel',
      signalExpr: 'ne.signal',
      rssiRequireNotNullExpr: 'ne.signal IS NOT NULL',
    });

    const combined = where.join(' ');
    expect(combined).toContain('ne.signal');
    expect(ctx.getAppliedFilters().map((e) => e.field)).toContain('rssiMin');
  });
});

describe('applyEngagementFilters', () => {
  test('tag_type filter produces WHERE clause and is recorded as applied', () => {
    const ctx = new FilterBuildContext({ tag_type: ['threat', 'suspect'] }, { tag_type: true });

    const where = applyEngagementFilters(ctx, {
      bssidExpr: 'ne.bssid',
      tagAlias: 'nt',
      tagLowerExpr: 'LOWER(nt.threat_tag)',
      tagIgnoredExpr: 'COALESCE(nt.is_ignored, FALSE)',
    });

    expect(where.length).toBeGreaterThan(0);
    const appliedFields = ctx.getAppliedFilters().map((e) => e.field);
    expect(appliedFields).toContain('tag_type');
  });

  test('has_notes filter produces EXISTS subquery referencing bssidExpr', () => {
    const ctx = new FilterBuildContext({ has_notes: true }, { has_notes: true });

    const where = applyEngagementFilters(ctx, {
      bssidExpr: 'ne.bssid',
      tagAlias: 'nt',
      tagLowerExpr: 'LOWER(nt.threat_tag)',
      tagIgnoredExpr: 'COALESCE(nt.is_ignored, FALSE)',
    });

    const combined = where.join(' ');
    expect(combined).toContain('ne.bssid');
    expect(ctx.getAppliedFilters().map((e) => e.field)).toContain('has_notes');
  });

  test('returns empty array when no engagement filters are enabled', () => {
    const ctx = new FilterBuildContext({}, {});
    const where = applyEngagementFilters(ctx, {
      bssidExpr: 'ne.bssid',
      tagAlias: 'nt',
      tagLowerExpr: 'LOWER(nt.threat_tag)',
      tagIgnoredExpr: 'COALESCE(nt.is_ignored, FALSE)',
    });

    expect(where).toEqual([]);
  });
});
