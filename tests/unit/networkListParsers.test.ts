import { parseNetworkIdentity } from '../../server/src/api/routes/v1/networks/list/parsers/networkIdentity';
import { parseThreatFilters } from '../../server/src/api/routes/v1/networks/list/parsers/threatFilters';

describe('network identity parser', () => {
  it('returns empty defaults when filters are omitted', () => {
    expect(
      parseNetworkIdentity(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      )
    ).toEqual({
      ok: true,
      params: {
        ssidPattern: null,
        bssidList: null,
        quickSearchPattern: null,
        manufacturer: null,
        radioTypes: null,
        encryptionTypes: null,
        authMethods: null,
        insecureFlags: null,
        securityFlags: null,
        requireMacForBssid: false,
      },
    });
  });

  it('normalizes identity and security filters', () => {
    const result = parseNetworkIdentity(
      'Police',
      'aa:bb:cc:dd:ee:ff',
      'quick',
      'Vendor',
      'w,e',
      'WPA2,WPA3',
      'PSK,SAE',
      'open,wep',
      'secure'
    );

    expect(result).toEqual({
      ok: true,
      params: expect.objectContaining({
        ssidPattern: 'Police',
        bssidList: ['AA:BB:CC:DD:EE:FF'],
        quickSearchPattern: 'quick',
        manufacturer: 'Vendor',
        radioTypes: ['W', 'E'],
        encryptionTypes: ['WPA2', 'WPA3'],
        authMethods: ['PSK', 'SAE'],
        insecureFlags: ['open', 'wep'],
        securityFlags: ['secure'],
        requireMacForBssid: true,
      }),
    });
  });

  it('disables WiFi-only BSSID requirements when cellular types are present', () => {
    const result = parseNetworkIdentity(
      undefined,
      undefined,
      undefined,
      undefined,
      'W,L',
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        params: expect.objectContaining({ radioTypes: ['W', 'L'], requireMacForBssid: false }),
      })
    );
  });

  it.each([
    ['ssid', ['', undefined, undefined, undefined]],
    ['bssid', [undefined, 'invalid bssid!', undefined, undefined]],
    ['q', [undefined, undefined, '', undefined]],
    ['manufacturer', [undefined, undefined, undefined, '']],
  ])('rejects invalid %s input', (_name, args) => {
    const result = parseNetworkIdentity(
      args[0],
      args[1],
      args[2],
      args[3],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(result.ok).toBe(false);
  });
});

describe('threat filter parser', () => {
  it('normalizes threat levels, category aliases, and score bounds', () => {
    expect(parseThreatFilters('HIGH', '["critical","medium","custom"]', '10', '90')).toEqual({
      ok: true,
      params: {
        threatLevel: 'HIGH',
        threatCategories: ['CRITICAL', 'MED', 'CUSTOM'],
        threatScoreMin: 10,
        threatScoreMax: 90,
      },
    });
  });

  it('accepts an array and returns null for empty categories', () => {
    expect(parseThreatFilters(undefined, [], undefined, undefined)).toEqual({
      ok: true,
      params: {
        threatLevel: null,
        threatCategories: null,
        threatScoreMin: null,
        threatScoreMax: null,
      },
    });
  });

  it.each([
    ['invalid level', 'urgent', undefined, undefined, undefined, 'Invalid threat_level'],
    ['low minimum', undefined, undefined, '-1', undefined, 'Invalid threat_score_min'],
    ['high maximum', undefined, undefined, undefined, '101', 'Invalid threat_score_max'],
  ])('rejects %s', (_name, level, categories, min, max, message) => {
    const result = parseThreatFilters(level, categories, min, max);
    expect(result).toEqual(
      expect.objectContaining({ ok: false, error: expect.stringContaining(message) })
    );
  });
});
