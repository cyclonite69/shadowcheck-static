import {
  validateWigleNetworksQuery,
  validateWigleSearchQuery,
} from '../../server/src/api/routes/v1/wigle/validation';

type Middleware = (req: any, res: any, next: any) => unknown;
type MockRequest = {
  query: Record<string, unknown>;
  validated?: unknown;
};

const runMiddleware = (middleware: Middleware, query: Record<string, unknown>) => {
  const req: MockRequest = { query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  middleware(req, res, next);

  return { req, res, next };
};

describe('wigle validation middleware', () => {
  describe('validateWigleSearchQuery', () => {
    it('accepts valid search params and stores typed validated values', () => {
      const { req, res, next } = runMiddleware(validateWigleSearchQuery, {
        ssid: 'CourtNet',
        bssid: 'AA:BB:CC:DD:EE:FF',
        limit: '50',
      });

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(req.validated).toEqual({
        ssid: 'CourtNet',
        bssid: 'AA:BB:CC:DD:EE:FF',
        limit: 50,
      });
    });

    it('treats omitted optional params as valid', () => {
      const { req, next } = runMiddleware(validateWigleSearchQuery, {});

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validated).toEqual({
        ssid: undefined,
        bssid: undefined,
        limit: undefined,
      });
    });

    it('rejects an out-of-range limit and reports the offending parameter', () => {
      const { res, next } = runMiddleware(validateWigleSearchQuery, { limit: '0' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        details: [{ parameter: 'limit', error: expect.stringContaining('limit must be between') }],
      });
    });
  });

  describe('validateWigleNetworksQuery', () => {
    it('accepts paging and type filters at valid boundaries', () => {
      const { req, next } = runMiddleware(validateWigleNetworksQuery, {
        limit: '1',
        offset: '0',
        type: 'WiFi',
      });

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validated).toEqual({
        limit: 1,
        offset: 0,
        type: 'WiFi',
      });
    });

    it('rejects offsets over the configured validation ceiling', () => {
      const { res, next } = runMiddleware(validateWigleNetworksQuery, {
        offset: '10000001',
      });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].details).toEqual([
        { parameter: 'offset', error: expect.stringContaining('offset must be between') },
      ]);
    });

    it('accepts empty strings as omitted optional params', () => {
      const { req, next } = runMiddleware(validateWigleNetworksQuery, {
        limit: '',
        offset: '',
        type: '',
      });

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validated).toEqual({
        limit: '',
        offset: '',
        type: '',
      });
    });
  });
});
