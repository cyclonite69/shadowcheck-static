/**
 * Unit tests for networkSqlExpressions
 *
 * Pure-function tests — no DB connection or mocking required.
 * Verifies SQL fragment structure and content for all exported builders.
 */

export {};

import {
  OPEN_PREDICATE,
  encryptionTypePredicate,
  buildEncryptionTypeCondition,
  buildThreatScoreExpr,
  buildThreatLevelExpr,
  buildTypeExpr,
  buildDistanceExpr,
} from '../../server/src/utils/networkSqlExpressions';

// ── OPEN_PREDICATE ────────────────────────────────────────────────────────────

describe('OPEN_PREDICATE', () => {
  it('matches NULL security', () => {
    expect(OPEN_PREDICATE).toContain('IS NULL');
  });

  it('matches empty string security', () => {
    expect(OPEN_PREDICATE).toContain("= ''");
  });

  it('excludes rows with recognised encryption keywords via !~*', () => {
    expect(OPEN_PREDICATE).toContain('!~*');
    expect(OPEN_PREDICATE).toMatch(/WPA/);
    expect(OPEN_PREDICATE).toMatch(/WEP/);
    expect(OPEN_PREDICATE).toMatch(/RSN/);
  });
});

// ── encryptionTypePredicate ───────────────────────────────────────────────────

describe('encryptionTypePredicate', () => {
  it('OPEN returns the OPEN_PREDICATE constant', () => {
    expect(encryptionTypePredicate('OPEN')).toBe(OPEN_PREDICATE);
  });

  it('NONE (legacy alias) also returns the OPEN_PREDICATE constant', () => {
    expect(encryptionTypePredicate('NONE')).toBe(OPEN_PREDICATE);
  });

  it('WEP returns a predicate containing WEP ILIKE', () => {
    const pred = encryptionTypePredicate('WEP');
    expect(pred).toContain('WEP');
    expect(pred).toMatch(/ILIKE/i);
  });

  it('WPA returns predicate that includes WPA but excludes WPA2 and WPA3', () => {
    const pred = encryptionTypePredicate('WPA');
    expect(pred).toContain("ILIKE '%WPA%'");
    expect(pred).toContain("NOT ILIKE '%WPA2%'");
    expect(pred).toContain("NOT ILIKE '%WPA3%'");
    expect(pred).toMatch(/RSN|SAE/); // also excludes RSN/SAE
  });

  it('WPA2 predicate includes RSN and excludes WPA3', () => {
    const pred = encryptionTypePredicate('WPA2');
    expect(pred).toMatch(/RSN/);
    expect(pred).toContain("NOT ILIKE '%WPA3%'");
  });

  it('WPA3 predicate includes SAE (WPA3-Personal) and WPA3', () => {
    const pred = encryptionTypePredicate('WPA3');
    expect(pred).toMatch(/SAE/);
    expect(pred).toContain('WPA3');
  });

  it('OWE returns a predicate matching OWE', () => {
    const pred = encryptionTypePredicate('OWE');
    expect(pred).toMatch(/OWE/);
  });

  it('SAE returns a predicate matching SAE', () => {
    const pred = encryptionTypePredicate('SAE');
    expect(pred).toMatch(/SAE/);
  });

  it('unknown type falls through to generic ILIKE with the value', () => {
    const pred = encryptionTypePredicate('CUSTOM_TYPE');
    expect(pred).toMatch(/ILIKE/i);
    expect(pred).toContain('CUSTOM_TYPE');
  });

  it('accepts lowercase input (case-insensitive switch)', () => {
    expect(encryptionTypePredicate('wpa3')).toEqual(encryptionTypePredicate('WPA3'));
  });
});

// ── buildEncryptionTypeCondition ──────────────────────────────────────────────

describe('buildEncryptionTypeCondition', () => {
  it('returns null for an empty array', () => {
    expect(buildEncryptionTypeCondition([])).toBeNull();
  });

  it('returns null for a falsy argument', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildEncryptionTypeCondition(null as any)).toBeNull();
  });

  it('wraps a single type in outer parentheses', () => {
    const result = buildEncryptionTypeCondition(['WEP']);
    expect(result).not.toBeNull();
    expect(result!.startsWith('(')).toBe(true);
    expect(result!.endsWith(')')).toBe(true);
    expect(result).toContain('WEP');
  });

  it('joins multiple types with OR', () => {
    const result = buildEncryptionTypeCondition(['WPA2', 'WPA3']);
    expect(result).not.toBeNull();
    expect(result).toMatch(/\bOR\b/);
    expect(result).toMatch(/RSN/); // WPA2 predicate
    expect(result).toMatch(/SAE/); // WPA3 predicate
  });

  it('includes OPEN_PREDICATE when OPEN is in the list', () => {
    const result = buildEncryptionTypeCondition(['OPEN']);
    expect(result).not.toBeNull();
    expect(result).toContain('IS NULL');
  });
});

// ── buildThreatScoreExpr ──────────────────────────────────────────────────────

describe('buildThreatScoreExpr', () => {
  describe('default scoring (simpleScoring = false)', () => {
    const expr = buildThreatScoreExpr(false);

    it('references final_threat_score', () => {
      expect(expr).toContain('final_threat_score');
    });

    it('applies 0.7 / 0.3 blend for THREAT classification', () => {
      expect(expr).toContain('0.7');
      expect(expr).toContain('0.3');
    });

    it('returns 0 for FALSE_POSITIVE', () => {
      expect(expr).toMatch(/FALSE_POSITIVE.*THEN 0/s);
    });

    it('wraps result in COALESCE', () => {
      expect(expr).toMatch(/COALESCE/i);
    });
  });

  describe('simple scoring (simpleScoring = true)', () => {
    const expr = buildThreatScoreExpr(true);

    it('references rule_based_score instead of final_threat_score', () => {
      expect(expr).toContain('rule_based_score');
      expect(expr).not.toContain('final_threat_score');
    });

    it('does not include the 0.7 blending factor', () => {
      expect(expr).not.toContain('0.7');
    });
  });
});

// ── buildThreatLevelExpr ──────────────────────────────────────────────────────

describe('buildThreatLevelExpr', () => {
  const scoreExpr = 'calculated_score';
  const levelExpr = buildThreatLevelExpr(scoreExpr);

  it('embeds the passed score expression in the output', () => {
    expect(levelExpr).toContain(scoreExpr);
  });

  it('maps >= 80 to CRITICAL', () => {
    expect(levelExpr).toMatch(/>= 80.*CRITICAL/s);
  });

  it('maps >= 60 to HIGH', () => {
    expect(levelExpr).toMatch(/>= 60.*HIGH/s);
  });

  it('maps >= 40 to MED', () => {
    expect(levelExpr).toMatch(/>= 40.*MED/s);
  });

  it('maps >= 20 to LOW', () => {
    expect(levelExpr).toMatch(/>= 20.*LOW/s);
  });

  it('falls back to NONE', () => {
    expect(levelExpr).toContain("'NONE'");
  });

  it('short-circuits FALSE_POSITIVE to NONE', () => {
    expect(levelExpr).toMatch(/FALSE_POSITIVE.*NONE/s);
  });
});

// ── buildTypeExpr ─────────────────────────────────────────────────────────────

describe('buildTypeExpr', () => {
  const expr = buildTypeExpr(); // default alias 'ne'

  it('uses the default table alias ne', () => {
    expect(expr).toContain('ne.type');
    expect(expr).toContain('ne.frequency');
  });

  it('maps WiFi aliases to W', () => {
    expect(expr).toMatch(/WIFI.*THEN 'W'/i);
  });

  it('maps BLE aliases to E', () => {
    expect(expr).toMatch(/BLE.*THEN 'E'/i);
  });

  it('maps LTE/4G aliases to L', () => {
    expect(expr).toMatch(/LTE.*THEN 'L'/i);
  });

  it('maps NR/5G aliases to N', () => {
    expect(expr).toMatch(/NR.*THEN 'N'/i);
  });

  it('maps GSM/2G aliases to G', () => {
    expect(expr).toMatch(/GSM.*THEN 'G'/i);
  });

  it('infers WiFi from frequency range 2412–7125', () => {
    expect(expr).toContain('BETWEEN 2412 AND 7125');
  });

  it('infers WiFi from security string patterns (WPA/WEP/ESS/RSN)', () => {
    expect(expr).toMatch(/WPA|WEP|ESS|RSN/);
  });

  it('uses a custom alias when provided', () => {
    const customExpr = buildTypeExpr('n');
    expect(customExpr).toContain('n.type');
    expect(customExpr).not.toContain('ne.type');
  });
});

// ── buildDistanceExpr ─────────────────────────────────────────────────────────

describe('buildDistanceExpr', () => {
  const lat = 37.4219;
  const lon = -122.084;
  const expr = buildDistanceExpr(lat, lon);

  it('uses ST_Distance for distance calculation', () => {
    expect(expr).toContain('ST_Distance');
  });

  it('embeds the home latitude as a numeric literal', () => {
    expect(expr).toContain(String(lat));
  });

  it('embeds the home longitude as a numeric literal', () => {
    expect(expr).toContain(String(lon));
  });

  it('divides by 1000 to convert metres to km', () => {
    expect(expr).toContain('/ 1000');
  });

  it('joins on the network bssid using the default ne alias', () => {
    expect(expr).toContain('ne.bssid');
  });

  it('scans observations with the default o alias', () => {
    expect(expr).toContain('FROM app.observations o');
  });

  it('uses custom aliases when provided', () => {
    const customExpr = buildDistanceExpr(lat, lon, 'net', 'obs');
    expect(customExpr).toContain('net.bssid');
    expect(customExpr).toContain('FROM app.observations obs');
  });

  it('casts coordinates to geography type', () => {
    expect(expr).toContain('::geography');
  });
});
