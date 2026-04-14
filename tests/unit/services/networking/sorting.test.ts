/**
 * Networking Sorting Unit Tests
 */

export {};

const { parseNetworkSort } = require('../../../../server/src/services/networking/sorting');

describe('Networking Sorting Service', () => {
  const channelExpr = 'ne.channel';
  const threatLevelExpr = 'ne.threat_level_expr';

  describe('parseNetworkSort()', () => {
    it('should parse simple string sort and order', () => {
      const result = parseNetworkSort('last_seen', 'DESC', channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([{ column: 'last_seen', direction: 'DESC' }]);
      expect(result.sortClauses).toBe('ne.last_seen DESC');
      expect(result.expensiveSort).toBe(false);
    });

    it('should handle comma-separated string sort', () => {
      const result = parseNetworkSort('last_seen,ssid', 'DESC,ASC', channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([
        { column: 'last_seen', direction: 'DESC' },
        { column: 'ssid', direction: 'ASC' },
      ]);
      expect(result.sortClauses).toBe('ne.last_seen DESC, lower(ne.ssid) ASC');
      expect(result.expensiveSort).toBe(true); // More than one sort
    });

    it('should normalize orders if only one is provided for multiple columns', () => {
      const result = parseNetworkSort('last_seen,ssid', 'DESC', channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([
        { column: 'last_seen', direction: 'DESC' },
        { column: 'ssid', direction: 'DESC' },
      ]);
    });

    it('should parse JSON array of objects', () => {
      const sortJson = JSON.stringify([
        { column: 'last_seen', direction: 'DESC' },
        { column: 'bssid', direction: 'ASC' },
      ]);
      const result = parseNetworkSort(sortJson, null, channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([
        { column: 'last_seen', direction: 'DESC' },
        { column: 'bssid', direction: 'ASC' },
      ]);
      expect(result.expensiveSort).toBe(true);
    });

    it('should parse a single JSON object', () => {
      const sortJson = JSON.stringify({ column: 'last_seen', direction: 'DESC' });
      const result = parseNetworkSort(sortJson, null, channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([{ column: 'last_seen', direction: 'DESC' }]);
      expect(result.expensiveSort).toBe(false);
    });

    it('should ignore invalid sort columns', () => {
      const result = parseNetworkSort(
        'invalid_col,last_seen',
        'ASC,DESC',
        channelExpr,
        threatLevelExpr
      );
      expect(result.sortEntries).toEqual([{ column: 'last_seen', direction: 'DESC' }]);
      expect(result.ignoredSorts).toContain('invalid_col');
    });

    it('should default to last_seen DESC if no valid sorts are provided', () => {
      const result = parseNetworkSort('invalid_col', 'ASC', channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([{ column: 'last_seen', direction: 'DESC' }]);
      expect(result.ignoredSorts).toContain('invalid_col');
    });

    it('should handle special columns like threat_order', () => {
      const result = parseNetworkSort('threat_order', 'DESC', channelExpr, threatLevelExpr);
      expect(result.sortClauses).toContain('CASE ne.threat_level_expr');
      expect(result.sortClauses).toContain("WHEN 'CRITICAL' THEN 4");
    });

    it('should handle threat ML related columns', () => {
      const result = parseNetworkSort('threat_ml_score', 'DESC', channelExpr, threatLevelExpr);
      expect(result.sortClauses).toBe(
        "COALESCE((nts.ml_feature_values->>'ml_score')::numeric, 0) DESC"
      );
    });

    it('should mark non-indexed sorts as expensive', () => {
      const result = parseNetworkSort('manufacturer', 'ASC', channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([{ column: 'manufacturer', direction: 'ASC' }]);
      expect(result.expensiveSort).toBe(true); // manufacturer is not in indexedSorts
    });

    it('should handle mixed valid and invalid JSON entries', () => {
      const sortJson = JSON.stringify([
        { column: 'last_seen', direction: 'DESC' },
        'invalid',
        { column: 'invalid_col', direction: 'ASC' },
        null,
      ]);
      const result = parseNetworkSort(sortJson, null, channelExpr, threatLevelExpr);
      expect(result.sortEntries).toEqual([{ column: 'last_seen', direction: 'DESC' }]);
      expect(result.ignoredSorts).toContain('invalid_col');
    });
  });
});
