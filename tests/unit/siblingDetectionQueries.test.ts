import {
  buildRefreshChunkSql,
  REFRESH_CHUNK_SQL,
  SIBLING_COVERAGE_SQL,
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

  test('demotes generic fallback rules confidence levels below 1.0', () => {
    const qs = buildRefreshChunkSql({ pairAudit: false });
    // Class A / Unnamed Recursive (Class A) demoted to 0.900
    expect(qs).toContain(
      "WHEN s.rule IN ('Class A', 'Unnamed Recursive (Class A)') THEN LEAST(0.900, s.confidence)"
    );
    // Class B / Unnamed Recursive (Class B) demoted to 0.850
    expect(qs).toContain(
      "WHEN s.rule IN ('Class B', 'Unnamed Recursive (Class B)') THEN LEAST(0.850, s.confidence)"
    );
    // Class C / Unnamed Recursive (Class C) demoted to 0.800
    expect(qs).toContain(
      "WHEN s.rule IN ('Class C', 'Unnamed Recursive (Class C)') THEN LEAST(0.800, s.confidence)"
    );
  });

  test('demotes Mist VAP confidence to 0.900 when SSIDs are non-empty and unrelated', () => {
    const qs = buildRefreshChunkSql({ pairAudit: false });
    expect(qs).toContain(
      "WHEN s.rule IN ('Mist Systems VAP (Class A)', 'Mist Systems Cross-Band (Class A)')"
    );
    expect(qs).toContain("AND s.n1 <> '' AND s.n2 <> ''");
    expect(qs).toContain("AND NOT (s.n1 = s.n2 OR s.n1 LIKE s.n2 || '%' OR s.n2 LIKE s.n1 || '%')");
    expect(qs).toContain('THEN LEAST(0.900, s.confidence)');
  });

  test('SIBLING_COVERAGE_SQL structure treats pairs as undirected (uses UNION of bssid1 and bssid2)', () => {
    expect(SIBLING_COVERAGE_SQL).toContain('SELECT bssid1 AS bssid FROM app.network_sibling_pairs');
    expect(SIBLING_COVERAGE_SQL).toContain('UNION');
    expect(SIBLING_COVERAGE_SQL).toContain('SELECT bssid2 AS bssid FROM app.network_sibling_pairs');
    expect(SIBLING_COVERAGE_SQL).toContain('total_wifi_bssids');
    expect(SIBLING_COVERAGE_SQL).toContain('bssids_with_siblings');
    expect(SIBLING_COVERAGE_SQL).toContain('coverage_pct');
  });
});
