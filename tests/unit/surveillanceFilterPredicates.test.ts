export {};

import { FilterBuildContext } from '../../server/src/services/filterQueryBuilder/FilterBuildContext';
import { buildNetworkWhere } from '../../server/src/services/filterQueryBuilder/networkWhereBuilder';
import { buildFastPathSupplementalPredicates } from '../../server/src/services/filterQueryBuilder/modules/networkFastPathSupplementalPredicates';

// ── networkWhereBuilder ───────────────────────────────────────────────────────

describe('buildNetworkWhere — surveillance sub-filters', () => {
  test('flock filter generates network_tags @> ["flock"] EXISTS clause', () => {
    const ctx = new FilterBuildContext({ flock: true }, { flock: true });
    const where = buildNetworkWhere(ctx);
    expect(where.some((w) => w.includes('nt_flock') && w.includes('"flock"'))).toBe(true);
    expect(ctx.getAppliedFilters().map((f) => f.field)).toContain('flock');
  });

  test('bwc filter generates network_tags @> ["bwc"] EXISTS clause', () => {
    const ctx = new FilterBuildContext({ bwc: true }, { bwc: true });
    const where = buildNetworkWhere(ctx);
    expect(where.some((w) => w.includes('nt_bwc') && w.includes('"bwc"'))).toBe(true);
    expect(ctx.getAppliedFilters().map((f) => f.field)).toContain('bwc');
  });

  test('shotspotter filter generates network_tags @> ["shotspotter"] EXISTS clause', () => {
    const ctx = new FilterBuildContext({ shotspotter: true }, { shotspotter: true });
    const where = buildNetworkWhere(ctx);
    expect(where.some((w) => w.includes('nt_shot') && w.includes('"shotspotter"'))).toBe(true);
    expect(ctx.getAppliedFilters().map((f) => f.field)).toContain('shotspotter');
  });

  test('flock filter disabled when enabled flag is false', () => {
    const ctx = new FilterBuildContext({ flock: true }, { flock: false });
    const where = buildNetworkWhere(ctx);
    expect(where.some((w) => w.includes('nt_flock'))).toBe(false);
  });

  test('flock and bwc can be combined', () => {
    const ctx = new FilterBuildContext({ flock: true, bwc: true }, { flock: true, bwc: true });
    const where = buildNetworkWhere(ctx);
    expect(where.some((w) => w.includes('nt_flock'))).toBe(true);
    expect(where.some((w) => w.includes('nt_bwc'))).toBe(true);
    const fields = ctx.getAppliedFilters().map((f) => f.field);
    expect(fields).toContain('flock');
    expect(fields).toContain('bwc');
  });
});

// ── networkFastPathSupplementalPredicates ─────────────────────────────────────

describe('buildFastPathSupplementalPredicates — surveillance sub-filters', () => {
  test('flock filter generates network_tags @> ["flock"] EXISTS clause', () => {
    const ctx = new FilterBuildContext({ flock: true }, { flock: true });
    const where = buildFastPathSupplementalPredicates(ctx, {});
    expect(where.some((w) => w.includes('nt_flock') && w.includes('"flock"'))).toBe(true);
    expect(ctx.getAppliedFilters().map((f) => f.field)).toContain('flock');
  });

  test('bwc filter generates network_tags @> ["bwc"] EXISTS clause', () => {
    const ctx = new FilterBuildContext({ bwc: true }, { bwc: true });
    const where = buildFastPathSupplementalPredicates(ctx, {});
    expect(where.some((w) => w.includes('nt_bwc') && w.includes('"bwc"'))).toBe(true);
    expect(ctx.getAppliedFilters().map((f) => f.field)).toContain('bwc');
  });

  test('shotspotter filter generates network_tags @> ["shotspotter"] EXISTS clause', () => {
    const ctx = new FilterBuildContext({ shotspotter: true }, { shotspotter: true });
    const where = buildFastPathSupplementalPredicates(ctx, {});
    expect(where.some((w) => w.includes('nt_shot') && w.includes('"shotspotter"'))).toBe(true);
    expect(ctx.getAppliedFilters().map((f) => f.field)).toContain('shotspotter');
  });

  test('flock filter disabled when enabled flag is false', () => {
    const ctx = new FilterBuildContext({ flock: true }, { flock: false });
    const where = buildFastPathSupplementalPredicates(ctx, {});
    expect(where.some((w) => w.includes('nt_flock'))).toBe(false);
  });
});
