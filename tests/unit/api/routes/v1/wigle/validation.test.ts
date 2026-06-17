import {
  validateWigleSearchQuery,
  validateWigleNetworksQuery,
} from '../../../../../../server/src/api/routes/v1/wigle/validation';

type Middleware = (req: any, res: any, next: any) => unknown;

const runQueryMiddleware = (middleware: Middleware, query: Record<string, unknown>) => {
  const req: { query: Record<string, unknown>; validated?: Record<string, unknown> } = { query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  middleware(req, res, next);

  return { req, res, next };
};

describe('wigle/validation', () => {
  describe('validateWigleSearchQuery', () => {
    it('accepts valid ssid parameter', () => {
      const result = runQueryMiddleware(validateWigleSearchQuery, {
        ssid: 'TestNetwork',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('ssid', 'TestNetwork');
    });

    it('accepts valid bssid parameter', () => {
      const result = runQueryMiddleware(validateWigleSearchQuery, {
        bssid: 'aa:bb:cc:dd:ee:ff',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('bssid', 'aa:bb:cc:dd:ee:ff');
    });

    it('accepts valid limit parameter', () => {
      const result = runQueryMiddleware(validateWigleSearchQuery, {
        limit: '100',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('limit', 100);
    });

    it('accepts combination of valid parameters', () => {
      const result = runQueryMiddleware(validateWigleSearchQuery, {
        ssid: 'Network',
        bssid: 'aa:bb:cc:dd:ee:ff',
        limit: '50',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toMatchObject({
        ssid: 'Network',
        bssid: 'aa:bb:cc:dd:ee:ff',
        limit: 50,
      });
    });

    it('handles optional parameters (all undefined)', () => {
      const result = runQueryMiddleware(validateWigleSearchQuery, {});
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toBeDefined();
    });
  });

  describe('validateWigleNetworksQuery', () => {
    it('accepts valid limit parameter', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {
        limit: '100',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('limit', 100);
    });

    it('accepts valid offset parameter', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {
        offset: '0',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('offset', 0);
    });

    it('accepts valid type parameter', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {
        type: 'WiFi',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('type', 'WiFi');
    });

    it('accepts combination of valid parameters', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {
        limit: '100',
        offset: '50',
        type: 'WiFi',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toMatchObject({
        limit: 100,
        offset: 50,
        type: 'WiFi',
      });
    });

    it('handles optional parameters (all undefined)', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {});
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toBeDefined();
    });

    it('accepts offset at minimum boundary (0)', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {
        offset: '0',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('offset', 0);
    });

    it('accepts offset within valid range', () => {
      const result = runQueryMiddleware(validateWigleNetworksQuery, {
        offset: '5000000',
      });
      expect(result.next).toHaveBeenCalledTimes(1);
      expect(result.req.validated).toHaveProperty('offset', 5000000);
    });
  });
});
