import express from 'express';
import request from 'supertest';

// Mock middleware
jest.mock('../../server/src/validation/middleware', () => ({
  macParamMiddleware: (req: any, _res: any, next: any) => {
    // Simply pass through
    next();
  },
}));

// Mock secretsManager
const secrets = new Map<string, string>();
jest.mock('../../server/src/services/secretsManager', () => ({
  get: (key: string) => secrets.get(key),
  setForTest: (key: string, val: string) => secrets.set(key, val),
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};
jest.mock('../../server/src/logging/logger', () => mockLogger);

// Mock WiGLE gateways & utils
const mockWigleGatewayFetch = jest.fn();
jest.mock('../../server/src/services/wigle/wigleGateway', () => ({
  wigleGatewayFetch: (...args: any[]) => mockWigleGatewayFetch(...args),
}));

jest.mock('../../server/src/services/wigleRequestUtils', () => ({
  getEncodedWigleAuth: jest.fn().mockReturnValue('mocked-base64-auth'),
}));

const liveRouter = require('../../server/src/api/routes/v1/wigle/live').default;

const app = express();
app.use(express.json());
app.use('/api', liveRouter);

describe('WiGLE Live API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    secrets.clear();
  });

  it('returns 503 if credentials are not configured', async () => {
    // credentials not set in secrets Map
    const res = await request(app).get('/api/live/AA:BB:CC:DD:EE:FF');
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('not configured');
  });

  it('returns network detail from WiGLE successfully', async () => {
    secrets.set('wigle_api_name', 'test-user');
    secrets.set('wigle_api_token', 'test-token');

    const mockResponseJson = jest
      .fn()
      .mockResolvedValue({ networkId: 'AA:BB:CC:DD:EE:FF', ssid: 'LiveNet' });
    const mockResponse = {
      ok: true,
      json: mockResponseJson,
    };
    mockWigleGatewayFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      response: mockResponse,
    });

    const res = await request(app).get('/api/live/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.network).toEqual({ networkId: 'AA:BB:CC:DD:EE:FF', ssid: 'LiveNet' });
    expect(mockWigleGatewayFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'detail',
        url: 'https://api.wigle.net/api/v3/detail/wifi/AA%3ABB%3ACC%3ADD%3AEE%3AFF',
      })
    );
  });

  it('returns null network if networkId is missing in WiGLE response', async () => {
    secrets.set('wigle_api_name', 'test-user');
    secrets.set('wigle_api_token', 'test-token');

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({}), // empty body
    };
    mockWigleGatewayFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      response: mockResponse,
    });

    const res = await request(app).get('/api/live/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(200);
    expect(res.body.network).toBeNull();
  });

  it('handles gateway fetch errors (ok=false on result level)', async () => {
    secrets.set('wigle_api_name', 'test-user');
    secrets.set('wigle_api_token', 'test-token');

    mockWigleGatewayFetch.mockResolvedValueOnce({
      ok: false,
      status: 504,
      error: 'Gateway Timeout',
    });

    const res = await request(app).get('/api/live/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(504);
    expect(res.body.error).toContain('failed');
    expect(res.body.details).toBe('Gateway Timeout');
  });

  it('handles response errors (response.ok=false)', async () => {
    secrets.set('wigle_api_name', 'test-user');
    secrets.set('wigle_api_token', 'test-token');

    const mockResponse = {
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized access to WiGLE'),
    };
    mockWigleGatewayFetch.mockResolvedValueOnce({
      ok: true,
      status: 401,
      response: mockResponse,
    });

    const res = await request(app).get('/api/live/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('failed');
    expect(res.body.details).toBe('Unauthorized access to WiGLE');
  });
});
