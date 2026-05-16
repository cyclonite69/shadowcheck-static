import {
  buildRefreshChunkSql,
  REFRESH_CHUNK_SQL,
} from '../../server/src/services/admin/siblingDetectionQueries';

describe('buildRefreshChunkSql', () => {
  test('default export omits forensic audit CTEs and debug column', () => {
    expect(REFRESH_CHUNK_SQL).not.toContain('pair_refresh_audit');
    expect(REFRESH_CHUNK_SQL).not.toContain('debug_audit_events');
    expect(REFRESH_CHUNK_SQL).toContain('FROM final_pairs f');
  });

  test('pairAudit mode injects hit_competition, pair_refresh_audit, and debug_audit_events', () => {
    const qs = buildRefreshChunkSql({ pairAudit: true });
    expect(qs).toContain('hit_competition AS');
    expect(qs).toContain('pair_refresh_audit AS');
    expect(qs).toContain('debug_audit_events');
    expect(qs).toContain('would_downgrade_confidence');
    expect(qs).toContain('competing_hits');
  });
});
