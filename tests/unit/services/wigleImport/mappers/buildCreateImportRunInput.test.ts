import {
  buildCreateImportRunInput,
  clampPageSize,
  urlSearchParamsToObject,
} from '../../../../../server/src/services/wigleImport/mappers/buildCreateImportRunInput';

// Mock the params module so we control fingerprint/search-term logic
jest.mock('../../../../../server/src/services/wigleImport/params', () => {
  const crypto = require('crypto');
  const stableStringify = (v: unknown): string => JSON.stringify(v);

  return {
    DEFAULT_RESULTS_PER_PAGE: 100,
    normalizeImportParams: jest.fn((raw: Record<string, unknown>) => ({
      ssid: raw.ssid ?? undefined,
      region: raw.region ?? undefined,
      resultsPerPage: raw.resultsPerPage ? Number(raw.resultsPerPage) : 100,
      version: 'v2',
      country: 'US',
    })),
    getSearchTerm: jest.fn((q: Record<string, unknown>) => q.ssid ?? ''),
    getRequestFingerprint: jest.fn(
      (q: unknown) => crypto.createHash('sha256').update(stableStringify(q)).digest('hex')
    ),
    getRawRequestFingerprint: jest.fn(
      (q: unknown) => crypto.createHash('sha256').update(stableStringify(q)).digest('hex')
    ),
  };
});

describe('clampPageSize', () => {
  it('returns parsed value for a valid integer string', () => {
    expect(clampPageSize('50')).toBe(50);
  });

  it('returns parsed value for a numeric value', () => {
    expect(clampPageSize(200)).toBe(200);
  });

  it('returns DEFAULT_RESULTS_PER_PAGE (100) for undefined', () => {
    expect(clampPageSize(undefined)).toBe(100);
  });

  it('returns DEFAULT_RESULTS_PER_PAGE (100) for null', () => {
    expect(clampPageSize(null)).toBe(100);
  });

  it('returns DEFAULT_RESULTS_PER_PAGE for NaN string', () => {
    expect(clampPageSize('notanumber')).toBe(100);
  });

  it('returns DEFAULT_RESULTS_PER_PAGE for negative value', () => {
    expect(clampPageSize('-5')).toBe(100);
  });

  it('returns DEFAULT_RESULTS_PER_PAGE for 0', () => {
    expect(clampPageSize('0')).toBe(100);
  });

  it('returns parsed value for float string (truncates)', () => {
    expect(clampPageSize('42.9')).toBe(42);
  });
});

describe('urlSearchParamsToObject', () => {
  it('converts single-value params to an object', () => {
    const params = new URLSearchParams('ssid=test&country=US');
    const result = urlSearchParamsToObject(params);
    expect(result).toEqual({ ssid: 'test', country: 'US' });
  });

  it('converts duplicate keys to an array', () => {
    const params = new URLSearchParams('tag=a&tag=b&tag=c');
    const result = urlSearchParamsToObject(params);
    expect(result.tag).toEqual(['a', 'b', 'c']);
  });

  it('handles two values for same key (array promotion)', () => {
    const params = new URLSearchParams('x=1&x=2');
    const result = urlSearchParamsToObject(params);
    expect(result.x).toEqual(['1', '2']);
  });

  it('returns empty object for empty params', () => {
    const params = new URLSearchParams('');
    expect(urlSearchParamsToObject(params)).toEqual({});
  });
});

describe('buildCreateImportRunInput', () => {
  it('uses defaults when no overrides provided', () => {
    const result = buildCreateImportRunInput({ ssid: 'TestNet' });
    expect(result.source).toBe('wigle_v2');
    expect(result.apiVersion).toBe('v2');
    expect(typeof result.requestFingerprint).toBe('string');
    expect(result.requestFingerprint.length).toBe(64); // sha256 hex
  });

  it('applies source override when provided', () => {
    const result = buildCreateImportRunInput({}, { source: 'manual_upload' });
    expect(result.source).toBe('manual_upload');
  });

  it('applies api_version override when provided', () => {
    const result = buildCreateImportRunInput({}, { api_version: 'v3' });
    expect(result.apiVersion).toBe('v3');
  });

  it('applies search_term override when provided', () => {
    const result = buildCreateImportRunInput({}, { search_term: 'custom-term' });
    expect(result.searchTerm).toBe('custom-term');
  });

  it('uses raw request params when overrides are present (usesDirectMetadata path)', () => {
    const raw = { ssid: 'Net', resultsPerPage: '50', password: '' };
    const result = buildCreateImportRunInput(raw, { source: 'override' });
    // password should be stripped (empty string filtered by sanitize)
    expect(result.requestParams).not.toHaveProperty('password');
    expect(result.requestParams).toHaveProperty('ssid', 'Net');
    expect(result.pageSize).toBe(50);
  });

  it('strips undefined, null, and empty string from raw params in direct-metadata path', () => {
    const raw = { ssid: 'x', empty: '', nully: null, undef: undefined };
    const result = buildCreateImportRunInput(raw, { source: 'test' });
    expect(result.requestParams).toEqual({ ssid: 'x' });
  });

  it('sets state from normalized region', () => {
    const result = buildCreateImportRunInput({ region: 'CA' });
    expect(result.state).toBe('CA');
  });

  it('sets state to null when region is absent', () => {
    const result = buildCreateImportRunInput({});
    expect(result.state).toBeNull();
  });

  it('uses normalized requestParams when no overrides', () => {
    const result = buildCreateImportRunInput({ ssid: 'net' });
    // Without overrides, requestParams = normalized (which includes ssid from mock)
    expect(result.requestParams).toHaveProperty('ssid', 'net');
  });

  it('pageSize defaults to DEFAULT_RESULTS_PER_PAGE in non-direct path', () => {
    const result = buildCreateImportRunInput({});
    expect(result.pageSize).toBe(100);
  });

  it('returns a different fingerprint for different inputs', () => {
    const a = buildCreateImportRunInput({ ssid: 'AAA' });
    const b = buildCreateImportRunInput({ ssid: 'BBB' });
    expect(a.requestFingerprint).not.toBe(b.requestFingerprint);
  });
});
