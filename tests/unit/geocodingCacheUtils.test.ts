export {};
import {
  GEOCODABLE_OBSERVATION_PREDICATE,
  providerPriority,
  shouldReplaceAddressData,
  shouldSkipPoi,
} from '../../server/src/services/geocoding/cacheUtils';

describe('GEOCODABLE_OBSERVATION_PREDICATE', () => {
  test('is a non-empty SQL predicate string', () => {
    expect(typeof GEOCODABLE_OBSERVATION_PREDICATE).toBe('string');
    expect(GEOCODABLE_OBSERVATION_PREDICATE.trim().length).toBeGreaterThan(0);
    expect(GEOCODABLE_OBSERVATION_PREDICATE).toContain('lat');
    expect(GEOCODABLE_OBSERVATION_PREDICATE).toContain('lon');
  });
});

describe('providerPriority', () => {
  test('mapbox_v5_permanent has highest priority', () => {
    expect(providerPriority('mapbox_v5_permanent')).toBe(5);
  });

  test('mapbox and mapbox_v5 have priority 4', () => {
    expect(providerPriority('mapbox')).toBe(4);
    expect(providerPriority('mapbox_v5')).toBe(4);
  });

  test('locationiq > geocodio > opencage', () => {
    expect(providerPriority('locationiq')).toBeGreaterThan(providerPriority('geocodio'));
    expect(providerPriority('geocodio')).toBeGreaterThan(providerPriority('opencage'));
  });

  test('unknown provider returns 0', () => {
    expect(providerPriority('unknown_provider')).toBe(0);
    expect(providerPriority(null)).toBe(0);
    expect(providerPriority(undefined)).toBe(0);
    expect(providerPriority('')).toBe(0);
  });

  test('is case-insensitive', () => {
    expect(providerPriority('MAPBOX')).toBe(4);
    expect(providerPriority('LocationIQ')).toBe(3);
  });
});

describe('shouldSkipPoi', () => {
  test('returns false for null or undefined address', () => {
    expect(shouldSkipPoi(null)).toBe(false);
    expect(shouldSkipPoi(undefined)).toBe(false);
    expect(shouldSkipPoi('')).toBe(false);
  });

  test('returns true for known skip addresses', () => {
    expect(shouldSkipPoi('814 Martin Luther King Ave')).toBe(true);
    expect(shouldSkipPoi('816 Martin Luther King Blvd')).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(shouldSkipPoi('814 MARTIN LUTHER KING St')).toBe(true);
  });

  test('returns false for normal addresses', () => {
    expect(shouldSkipPoi('123 Main Street')).toBe(false);
    expect(shouldSkipPoi('1600 Pennsylvania Ave')).toBe(false);
  });
});

describe('shouldReplaceAddressData', () => {
  test('returns false when incoming has no address', () => {
    const current = { ok: true, address: '123 Main St', confidence: 0.8, provider: 'mapbox' };
    expect(shouldReplaceAddressData(current, { ok: false, address: null })).toBe(false);
    expect(shouldReplaceAddressData(current, { ok: true, address: null })).toBe(false);
  });

  test('returns true when current has no address', () => {
    const current = { ok: false, address: null };
    const incoming = { ok: true, address: '123 Main St', confidence: 0.5, provider: 'opencage' };
    expect(shouldReplaceAddressData(current, incoming)).toBe(true);
  });

  test('returns true when incoming confidence is significantly higher', () => {
    const current = { ok: true, address: 'Old St', confidence: 0.5, provider: 'opencage' };
    const incoming = { ok: true, address: 'New St', confidence: 0.7, provider: 'opencage' };
    expect(shouldReplaceAddressData(current, incoming)).toBe(true);
  });

  test('returns false when incoming confidence is lower', () => {
    const current = { ok: true, address: 'Good St', confidence: 0.9, provider: 'mapbox' };
    const incoming = { ok: true, address: 'Worse St', confidence: 0.5, provider: 'mapbox' };
    expect(shouldReplaceAddressData(current, incoming)).toBe(false);
  });

  test('uses provider priority as tiebreaker when confidence is similar', () => {
    const current = { ok: true, address: 'Addr', confidence: 0.8, provider: 'opencage' };
    const incomingHigherProvider = {
      ok: true,
      address: 'Addr2',
      confidence: 0.8,
      provider: 'mapbox',
    };
    expect(shouldReplaceAddressData(current, incomingHigherProvider)).toBe(true);

    const incomingLowerProvider = {
      ok: true,
      address: 'Addr3',
      confidence: 0.8,
      provider: 'opencage',
    };
    expect(shouldReplaceAddressData(current, incomingLowerProvider)).toBe(false);
  });
});
