export {};

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../server/src/services/wigle/wigleGateway', () => ({
  wigleGatewayFetch: jest.fn(),
}));

jest.mock('../../../server/src/services/secretsManager', () => {
  const mockGet = jest.fn();
  return {
    __esModule: true,
    default: { get: mockGet },
    get: mockGet,
  };
});

jest.mock('../../../server/src/services/wigleRequestUtils', () => ({
  hashRecord: jest.fn().mockReturnValue('hash123'),
}));

import { getUserStats } from '../../../server/src/services/wigle/api';
const { wigleGatewayFetch } = require('../../../server/src/services/wigle/wigleGateway');
const secretsManagerModule = require('../../../server/src/services/secretsManager');
const mockGet: jest.Mock = secretsManagerModule.default.get;

const mockResponse = (ok: boolean, data: any, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(data),
});

describe('wigle/api — getUserStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws when wigle_api_name is missing', async () => {
    mockGet.mockReturnValue(null);
    await expect(getUserStats()).rejects.toThrow('WiGLE API credentials not configured');
  });

  test('throws when wigle_api_token is missing', async () => {
    mockGet.mockReturnValueOnce('myname').mockReturnValueOnce(null);
    await expect(getUserStats()).rejects.toThrow('WiGLE API credentials not configured');
  });

  test('calls the correct WiGLE profile/user URL', async () => {
    mockGet.mockReturnValue('value');
    wigleGatewayFetch.mockResolvedValue({
      ok: true,
      response: mockResponse(true, { success: true }),
    });
    await getUserStats();
    const callArgs = wigleGatewayFetch.mock.calls[0][0];
    expect(callArgs.url).toBe('https://api.wigle.net/api/v2/profile/user');
  });

  test('returns parsed JSON on success', async () => {
    mockGet.mockReturnValue('value');
    wigleGatewayFetch.mockResolvedValue({
      ok: true,
      response: mockResponse(true, { success: true, statistics: {} }),
    });
    const result = await getUserStats();
    expect(result).toEqual({ success: true, statistics: {} });
  });

  test('throws when gateway returns ok:false', async () => {
    mockGet.mockReturnValue('value');
    wigleGatewayFetch.mockResolvedValue({ ok: false, error: 'Network timeout', status: undefined });
    await expect(getUserStats()).rejects.toThrow('Network timeout');
  });

  test('throws with API error message on non-ok HTTP response', async () => {
    mockGet.mockReturnValue('value');
    wigleGatewayFetch.mockResolvedValue({
      ok: true,
      response: mockResponse(false, { message: 'Forbidden' }, 403),
    });
    await expect(getUserStats()).rejects.toThrow('Forbidden');
  });

  test('throws with status code when error body has no message', async () => {
    mockGet.mockReturnValue('value');
    wigleGatewayFetch.mockResolvedValue({
      ok: true,
      response: { ok: false, status: 500, json: () => Promise.reject(new Error('bad json')) },
    });
    await expect(getUserStats()).rejects.toThrow('WiGLE API error: 500');
  });

  test('sends Basic auth header with base64-encoded credentials', async () => {
    mockGet.mockReturnValueOnce('testname').mockReturnValueOnce('testtoken');
    wigleGatewayFetch.mockResolvedValue({ ok: true, response: mockResponse(true, {}) });
    await getUserStats();
    const callArgs = wigleGatewayFetch.mock.calls[0][0];
    const expected = Buffer.from('testname:testtoken').toString('base64');
    expect(callArgs.init.headers.Authorization).toBe(`Basic ${expected}`);
  });
});
