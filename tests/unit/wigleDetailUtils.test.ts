export {};

import {
  computeTemporalSummary,
  computeSsidDisplaySummary,
  bestObservedSsid,
  isHiddenSsid,
} from '../../client/src/utils/wigleDetailUtils';

// ─── computeTemporalSummary ───────────────────────────────────────────────────

describe('computeTemporalSummary', () => {
  const obs = (observed_at: string) => ({ observed_at });

  test('multiple observations produce earliest firstSeen and latest lastSeen', () => {
    const result = computeTemporalSummary(
      [obs('2026-05-28T03:00:00Z'), obs('2026-05-21T03:00:00Z'), obs('2026-05-25T12:00:00Z')],
      null
    );
    expect(result.firstSeen).toBe(new Date('2026-05-21T03:00:00Z').toISOString());
    expect(result.lastSeen).toBe(new Date('2026-05-28T03:00:00Z').toISOString());
  });

  test('selected observation timestamp is separate from first/last', () => {
    const result = computeTemporalSummary(
      [obs('2026-05-21T03:00:00Z'), obs('2026-05-28T03:00:00Z')],
      '2026-05-25T12:00:00Z'
    );
    expect(result.selectedSeen).toBe('2026-05-25T12:00:00Z');
    // first/last must NOT change because of selectedSeen
    expect(result.firstSeen).toBe(new Date('2026-05-21T03:00:00Z').toISOString());
    expect(result.lastSeen).toBe(new Date('2026-05-28T03:00:00Z').toISOString());
  });

  test('single observation produces same first and last', () => {
    const result = computeTemporalSummary([obs('2026-05-21T03:00:00Z')], null);
    expect(result.firstSeen).toBe(result.lastSeen);
  });

  test('invalid/null timestamps are ignored', () => {
    const result = computeTemporalSummary(
      [{ observed_at: null }, { observed_at: 'not-a-date' }, obs('2026-05-21T03:00:00Z')],
      null
    );
    expect(result.firstSeen).toBe(new Date('2026-05-21T03:00:00Z').toISOString());
    expect(result.lastSeen).toBe(new Date('2026-05-21T03:00:00Z').toISOString());
  });

  test('empty observations with no data timestamps returns nulls', () => {
    const result = computeTemporalSummary([], null);
    expect(result.firstSeen).toBeNull();
    expect(result.lastSeen).toBeNull();
    expect(result.selectedSeen).toBeNull();
  });

  test('data.firstSeen/lastSeen are folded in when no individual observations', () => {
    const result = computeTemporalSummary([], null, '2026-05-01T00:00:00Z', '2026-05-20T00:00:00Z');
    expect(result.firstSeen).toBe(new Date('2026-05-01T00:00:00Z').toISOString());
    expect(result.lastSeen).toBe(new Date('2026-05-20T00:00:00Z').toISOString());
  });

  test('observationCount reflects list length', () => {
    const result = computeTemporalSummary(
      [obs('2026-05-21T03:00:00Z'), obs('2026-05-22T03:00:00Z')],
      null
    );
    expect(result.observationCount).toBe(2);
  });

  test('null selectedObs timestamp produces null selectedSeen', () => {
    const result = computeTemporalSummary([obs('2026-05-21T03:00:00Z')], null);
    expect(result.selectedSeen).toBeNull();
  });
});

// ─── isHiddenSsid ─────────────────────────────────────────────────────────────

describe('isHiddenSsid', () => {
  test.each([null, undefined, '', '(hidden)', 'hidden', '(blank)'])('treats %s as hidden', (val) =>
    expect(isHiddenSsid(val)).toBe(true)
  );

  test.each(['FBI Surveillance Van', 'MyNetwork', '0'])('treats %s as visible', (val) =>
    expect(isHiddenSsid(val)).toBe(false)
  );
});

// ─── computeSsidDisplaySummary ────────────────────────────────────────────────

describe('computeSsidDisplaySummary', () => {
  test('canonical (hidden) + observed SSID exposes observedSsid', () => {
    const s = computeSsidDisplaySummary('(hidden)', 'FBI Surveillance Van');
    expect(s.isHiddenCanonical).toBe(true);
    expect(s.canonicalSsid).toBeNull();
    expect(s.observedSsid).toBe('FBI Surveillance Van');
    expect(s.displayTitle).toBe('FBI Surveillance Van');
  });

  test('canonical hidden + no observed SSID → displayTitle is (hidden)', () => {
    const s = computeSsidDisplaySummary(null, null);
    expect(s.displayTitle).toBe('(hidden)');
    expect(s.observedSsid).toBeNull();
  });

  test('canonical visible + same observed SSID → no duplicate', () => {
    const s = computeSsidDisplaySummary('MyNetwork', 'MyNetwork');
    expect(s.canonicalSsid).toBe('MyNetwork');
    expect(s.observedSsid).toBe('MyNetwork');
    expect(s.displayTitle).toBe('MyNetwork');
    expect(s.isHiddenCanonical).toBe(false);
  });

  test('canonical visible + different observed SSID → both exposed', () => {
    const s = computeSsidDisplaySummary('CorpWifi', 'FBI Van');
    expect(s.canonicalSsid).toBe('CorpWifi');
    expect(s.observedSsid).toBe('FBI Van');
    expect(s.displayTitle).toBe('CorpWifi'); // canonical wins for title
    expect(s.isHiddenCanonical).toBe(false);
  });

  test('blank string treated same as hidden', () => {
    const s = computeSsidDisplaySummary('', 'FBI Surveillance Van');
    expect(s.isHiddenCanonical).toBe(true);
    expect(s.observedSsid).toBe('FBI Surveillance Van');
  });
});

// ─── bestObservedSsid ─────────────────────────────────────────────────────────

describe('bestObservedSsid', () => {
  test('selected obs SSID takes priority over observation list', () => {
    const result = bestObservedSsid([{ ssid: 'FromList' }], 'FromSelected');
    expect(result).toBe('FromSelected');
  });

  test('falls back to first visible SSID in list when selected is null', () => {
    const result = bestObservedSsid(
      [{ ssid: null }, { ssid: '(hidden)' }, { ssid: 'FBI Surveillance Van' }],
      null
    );
    expect(result).toBe('FBI Surveillance Van');
  });

  test('returns null when all SSIDs are hidden', () => {
    const result = bestObservedSsid([{ ssid: null }, { ssid: '' }], null);
    expect(result).toBeNull();
  });

  test('empty list + no selected returns null', () => {
    expect(bestObservedSsid([], null)).toBeNull();
  });
});
