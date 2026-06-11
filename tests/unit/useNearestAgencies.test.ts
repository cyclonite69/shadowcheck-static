// Mock the agencyApi files to prevent loading client.ts with import.meta in Jest
jest.mock('../../client/src/api/agencyApi', () => ({
  agencyApi: {
    getNearestAgencies: jest.fn(),
    getNearestAgenciesBatch: jest.fn(),
  },
}));

jest.mock(
  '../../../api/agencyApi',
  () => ({
    agencyApi: {
      getNearestAgencies: jest.fn(),
      getNearestAgenciesBatch: jest.fn(),
    },
  }),
  { virtual: true }
);

import { getNearestAgenciesBssidKey } from '../../client/src/components/geospatial/hooks/useNearestAgencies';

describe('useNearestAgencies helper', () => {
  it('builds a stable BSSID dependency key without mutating the input array', () => {
    const input = ['BB:BB:BB:BB:BB:02', 'AA:AA:AA:AA:AA:01'];
    const copy = [...input];

    expect(getNearestAgenciesBssidKey(input)).toBe('AA:AA:AA:AA:AA:01,BB:BB:BB:BB:BB:02');
    expect(input).toEqual(copy);
  });

  it('handles single BSSID string', () => {
    expect(getNearestAgenciesBssidKey('AA:AA:AA:AA:AA:01')).toBe('AA:AA:AA:AA:AA:01');
  });

  it('handles null or empty input', () => {
    expect(getNearestAgenciesBssidKey(null)).toBe('');
    expect(getNearestAgenciesBssidKey('')).toBe('');
  });
});
