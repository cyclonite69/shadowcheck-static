import { buildFilterStateParams, parseFilterStateParams } from '../filterUrlState';

describe('filterUrlState', () => {
  it('builds URL params for filters and enabled payload', () => {
    const payload = {
      filters: { ssid: 'undertaker', threatCategories: ['high'] } as any,
      enabled: { ssid: true, threatCategories: true },
    };

    const params = buildFilterStateParams(payload);

    expect(params.get('filters')).toBe(JSON.stringify(payload.filters));
    expect(params.get('enabled')).toBe(JSON.stringify(payload.enabled));
  });

  it('parses valid URL params payload', () => {
    const params = new URLSearchParams();
    params.set('filters', JSON.stringify({ ssid: 'fbi' }));
    params.set('enabled', JSON.stringify({ ssid: true }));

    expect(parseFilterStateParams(params)).toEqual({
      filters: { ssid: 'fbi' },
      enabled: { ssid: true },
    });
  });

  it('returns null when params are missing or invalid', () => {
    const missing = new URLSearchParams();
    const invalid = new URLSearchParams({
      filters: '{not json',
      enabled: '{"ssid":true}',
    });

    expect(parseFilterStateParams(missing)).toBeNull();
    expect(parseFilterStateParams(invalid)).toBeNull();
  });
});
