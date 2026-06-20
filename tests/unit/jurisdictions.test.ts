import {
  isProbeDispatchable,
  TERRITORY_PROBE_SUPPORT,
  US_JURISDICTIONS,
  US_JURISDICTION_CODES,
} from '../../server/src/constants/jurisdictions';
import { US_STATES } from '../../client/src/constants/network';

describe('canonical US jurisdictions', () => {
  it('contains each of the 56 USPS jurisdictions exactly once', () => {
    expect(US_JURISDICTIONS).toHaveLength(56);
    expect(new Set(US_JURISDICTION_CODES).size).toBe(56);
  });

  it('matches the client Coverage Grid display list', () => {
    expect(US_STATES.map(({ code, name }) => ({ code, name }))).toEqual(US_JURISDICTIONS);
  });

  it('keeps Puerto Rico supported for normal US-region probes', () => {
    expect(TERRITORY_PROBE_SUPPORT.PR).toBe('supported');
    expect(isProbeDispatchable('PR')).toBe(true);
    expect(isProbeDispatchable('pr')).toBe(true);
  });

  it.each(['AS', 'GU', 'MP', 'VI'])('%s is unverified and not dispatchable', (code) => {
    expect(TERRITORY_PROBE_SUPPORT[code]).toBe('unverified');
    expect(isProbeDispatchable(code)).toBe(false);
  });

  it('rejects unknown jurisdiction codes', () => {
    expect(isProbeDispatchable('ZZ')).toBe(false);
  });
});
