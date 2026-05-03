export {};

import {
  splitTextFilterTokens,
  normalizeWildcards,
  isOui,
  coerceOui,
} from '../../server/src/services/filterQueryBuilder/normalizers';

describe('splitTextFilterTokens', () => {
  test('splits comma-separated tokens and trims whitespace', () => {
    expect(splitTextFilterTokens('Home, Guest, Corp')).toEqual(['Home', 'Guest', 'Corp']);
  });

  test('returns empty array for non-string input', () => {
    expect(splitTextFilterTokens(null)).toEqual([]);
    expect(splitTextFilterTokens(42)).toEqual([]);
    expect(splitTextFilterTokens(undefined)).toEqual([]);
  });

  test('returns empty array for empty string', () => {
    expect(splitTextFilterTokens('')).toEqual([]);
  });

  test('filters out blank tokens from trailing commas', () => {
    expect(splitTextFilterTokens('Home,,Guest,')).toEqual(['Home', 'Guest']);
  });

  test('returns single-element array when no comma present', () => {
    expect(splitTextFilterTokens('Starbucks')).toEqual(['Starbucks']);
  });
});

describe('normalizeWildcards', () => {
  test('converts * to SQL % wildcard', () => {
    expect(normalizeWildcards('prefix*')).toBe('prefix%');
  });

  test('converts ? to SQL _ wildcard', () => {
    expect(normalizeWildcards('AA:BB:??:*')).toBe('AA:BB:__:%');
  });

  test('escapes literal % so it is not treated as wildcard', () => {
    expect(normalizeWildcards('100%')).toBe('100\\%');
  });

  test('escapes literal _ so it is not treated as single-char wildcard', () => {
    expect(normalizeWildcards('my_ssid')).toBe('my\\_ssid');
  });

  test('handles string with no special characters unchanged', () => {
    expect(normalizeWildcards('plaintext')).toBe('plaintext');
  });

  test('handles mixed escaping and conversion in one pass', () => {
    // literal % escaped, * converted to %, literal _ escaped
    expect(normalizeWildcards('50%_off*')).toBe('50\\%\\_off%');
  });
});

describe('isOui', () => {
  test('returns true for valid 6-char uppercase hex OUI', () => {
    expect(isOui('28A331')).toBe(true);
    expect(isOui('AABBCC')).toBe(true);
    expect(isOui('000000')).toBe(true);
  });

  test('returns false for lowercase hex', () => {
    expect(isOui('28a331')).toBe(false);
  });

  test('returns false for OUI with colons', () => {
    expect(isOui('28:A3:31')).toBe(false);
  });

  test('returns false for wrong length', () => {
    expect(isOui('28A33')).toBe(false);
    expect(isOui('28A3310')).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(isOui(null)).toBe(false);
    expect(isOui(undefined)).toBe(false);
  });
});

describe('coerceOui', () => {
  test('strips colons and uppercases a MAC prefix', () => {
    expect(coerceOui('28:a3:31')).toBe('28A331');
  });

  test('strips all non-hex characters', () => {
    expect(coerceOui('28-A3-31')).toBe('28A331');
  });

  test('returns empty string for null/undefined', () => {
    expect(coerceOui(null)).toBe('');
    expect(coerceOui(undefined)).toBe('');
  });

  test('passes through already-clean OUI unchanged', () => {
    expect(coerceOui('28A331')).toBe('28A331');
  });
});
