const explorerService = {
  checkHomeLocationForFilters: jest.fn(),
};
const logger = {
  warn: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  explorerService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const {
  parseJsonParam,
  assertHomeExistsIfNeeded,
  inferSecurity,
  inferRadioType,
  parseOptionalString,
  parseLimit,
  parsePage,
  parseOffset,
  normalizeQualityFilter,
} = require('../../server/src/api/routes/v1/explorer/shared');

describe('explorer shared route helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses JSON parameters and reports malformed input', () => {
    expect(parseJsonParam(undefined, { fallback: true }, 'filters')).toEqual({ fallback: true });
    expect(parseJsonParam('{"enabled":true}', {}, 'filters')).toEqual({ enabled: true });
    expect(() => parseJsonParam('{bad', {}, 'filters')).toThrow('Invalid JSON for filters');
  });

  it('checks required home-location availability', async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    explorerService.checkHomeLocationForFilters.mockResolvedValueOnce(true);

    await expect(assertHomeExistsIfNeeded(true, res)).resolves.toBe(true);
    expect(res.status).not.toHaveBeenCalled();

    explorerService.checkHomeLocationForFilters.mockResolvedValueOnce(false);
    await expect(assertHomeExistsIfNeeded(true, res)).resolves.toBe(false);
    expect(res.status).toHaveBeenLastCalledWith(400);
    expect(res.json).toHaveBeenLastCalledWith({
      ok: false,
      error: 'Home location is required for distance filters.',
    });

    explorerService.checkHomeLocationForFilters.mockRejectedValueOnce(new Error('check failed'));
    await expect(assertHomeExistsIfNeeded(true, res)).resolves.toBe(false);
    expect(res.json).toHaveBeenLastCalledWith({ ok: false, error: 'check failed' });
  });

  it.each([
    [null, null, 'OPEN'],
    ['[WPA3-SAE-CCMP][ESS]', null, 'WPA3-P'],
    ['[WPA3-EAP-CCMP][ESS]', null, 'WPA3-E'],
    ['[WPA2-PSK-CCMP][ESS]', null, 'WPA2-P'],
    ['[RSN-EAP-CCMP][ESS]', null, 'WPA2-E'],
    ['[WPA-PSK-TKIP][ESS]', null, 'WPA'],
    ['[WEP][ESS]', null, 'WEP'],
    ['[WPS][ESS]', null, 'WPS'],
    ['[ESS]', null, 'Unknown'],
    [null, 'WPA2', 'WPA2-P'],
  ])('infers security from capabilities or encryption', (capabilities, encryption, expected) => {
    expect(inferSecurity(capabilities, encryption)).toBe(expected);
  });

  it.each([
    ['W', 'anything', null, null, 'W'],
    [null, 'Carrier 5G', null, null, 'N'],
    [null, 'tower', null, 'NR', 'N'],
    [null, 'Carrier LTE', null, null, 'L'],
    [null, 'Carrier 3G', null, null, 'D'],
    [null, 'GSM tower', null, null, 'G'],
    [null, 'CDMA tower', null, null, 'C'],
    [null, 'Verizon node', null, null, 'L'],
    [null, '[Unknown / Spoofed Radio]', null, null, 'E'],
    [null, 'Bluetooth device', null, null, 'B'],
    [null, 'Bluetooth device', null, 'Bluetooth Low Energy', 'E'],
    [null, null, 2412, null, 'W'],
    [null, null, '5500', null, 'W'],
    [null, null, 6100, null, 'W'],
    [null, null, null, '[WPA2-PSK-CCMP]', 'W'],
    [null, 'unclassified', 800, null, '?'],
  ])(
    'infers radio type from explicit and heuristic evidence',
    (radioType, ssid, frequency, capabilities, expected) => {
      expect(inferRadioType(radioType, ssid, frequency, capabilities)).toBe(expected);
    }
  );

  it('normalizes optional strings and trims oversized values', () => {
    expect(parseOptionalString(undefined, 5, 'search')).toEqual({ ok: true, value: '' });
    expect(parseOptionalString('  value  ', 10, 'search')).toEqual({
      ok: true,
      value: 'value',
    });
    expect(parseOptionalString('123456', 5, 'search')).toEqual({
      ok: true,
      value: '12345',
    });
    expect(logger.warn).toHaveBeenCalledWith('Trimming search to 5 characters');
  });

  it('parses limits with defaults, all, valid values, and invalid fallbacks', () => {
    expect(parseLimit(undefined, 100, 500)).toEqual({ ok: true, value: 100 });
    expect(parseLimit('all', 100, 500)).toEqual({ ok: true, value: null });
    expect(parseLimit('25', 100, 500)).toEqual({ ok: true, value: 25 });
    expect(parseLimit('0', 100, 500)).toEqual({ ok: true, value: 100 });
    expect(parseLimit('501', 100, 500)).toEqual({ ok: true, value: 100 });
  });

  it('parses pages and offsets with bounded fallbacks', () => {
    expect(parsePage(undefined, 1, 100)).toEqual({ ok: true, value: 1 });
    expect(parsePage('4', 1, 100)).toEqual({ ok: true, value: 4 });
    expect(parsePage('0', 1, 100)).toEqual({ ok: true, value: 1 });
    expect(parseOffset(undefined, 0, 1000)).toEqual({ ok: true, value: 0 });
    expect(parseOffset('25', 0, 1000)).toEqual({ ok: true, value: 25 });
    expect(parseOffset('-1', 0, 1000)).toEqual({ ok: true, value: 0 });
  });

  it.each([
    ['temporal', 'temporal'],
    [' EXTREME ', 'extreme'],
    ['duplicate', 'duplicate'],
    ['all', 'all'],
    ['invalid', 'none'],
    [undefined, 'none'],
  ])('normalizes quality filters', (input, expected) => {
    expect(normalizeQualityFilter(input)).toBe(expected);
  });
});
