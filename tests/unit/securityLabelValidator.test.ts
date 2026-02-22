/**
 * Unit tests for securityLabelValidator
 *
 * Regression guard for security label normalization.
 * Ensures WPA3-SAE → WPA3-P and Unknown/unknown → UNKNOWN mappings hold,
 * and that all canonical labels pass through unchanged.
 */

import {
  normalizeLabel,
  isValidLabel,
  getAllCanonicalLabels,
  CANONICAL_SECURITY_LABELS,
} from '../../server/src/utils/securityLabelValidator';

// ── normalizeLabel ────────────────────────────────────────────────────────────

describe('normalizeLabel – alias mapping', () => {
  it('normalizes WPA3-SAE to WPA3-P', () => {
    expect(normalizeLabel('WPA3-SAE')).toBe('WPA3-P');
  });

  it('normalizes mixed-case Unknown to UNKNOWN', () => {
    expect(normalizeLabel('Unknown')).toBe('UNKNOWN');
  });

  it('normalizes lowercase unknown to UNKNOWN', () => {
    expect(normalizeLabel('unknown')).toBe('UNKNOWN');
  });
});

describe('normalizeLabel – canonical passthrough', () => {
  it.each([...CANONICAL_SECURITY_LABELS])(
    'passes canonical label %s through unchanged',
    (label) => {
      expect(normalizeLabel(label)).toBe(label);
    }
  );
});

describe('normalizeLabel – invalid input', () => {
  it('throws for an unrecognized label', () => {
    expect(() => normalizeLabel('GIBBERISH')).toThrow(/Unrecognized security label/);
  });

  it('throws for empty string', () => {
    expect(() => normalizeLabel('')).toThrow();
  });
});

// ── isValidLabel ─────────────────────────────────────────────────────────────

describe('isValidLabel', () => {
  it.each([...CANONICAL_SECURITY_LABELS])('returns true for canonical label %s', (label) => {
    expect(isValidLabel(label)).toBe(true);
  });

  it('returns false for WPA3-SAE (legacy alias, not canonical)', () => {
    expect(isValidLabel('WPA3-SAE')).toBe(false);
  });

  it('returns false for Unknown (wrong case)', () => {
    expect(isValidLabel('Unknown')).toBe(false);
  });

  it('returns false for unknown (lowercase)', () => {
    expect(isValidLabel('unknown')).toBe(false);
  });

  it('returns false for arbitrary strings', () => {
    expect(isValidLabel('FOO')).toBe(false);
    expect(isValidLabel('')).toBe(false);
  });
});

// ── getAllCanonicalLabels ─────────────────────────────────────────────────────

describe('getAllCanonicalLabels', () => {
  it('returns exactly 12 labels', () => {
    expect(getAllCanonicalLabels()).toHaveLength(12);
  });

  it('includes WPA3-P (not WPA3-SAE)', () => {
    const labels = getAllCanonicalLabels();
    expect(labels).toContain('WPA3-P');
    expect(labels).not.toContain('WPA3-SAE');
  });

  it('includes UNKNOWN (not Unknown or unknown)', () => {
    const labels = getAllCanonicalLabels();
    expect(labels).toContain('UNKNOWN');
    expect(labels).not.toContain('Unknown');
    expect(labels).not.toContain('unknown');
  });

  it('includes all expected canonical labels', () => {
    const labels = getAllCanonicalLabels();
    const expected = [
      'WPA3-E',
      'WPA3-P',
      'WPA3',
      'WPA2-E',
      'WPA2-P',
      'WPA2',
      'WPA',
      'OWE',
      'WPS',
      'WEP',
      'OPEN',
      'UNKNOWN',
    ];
    for (const label of expected) {
      expect(labels).toContain(label);
    }
  });
});
