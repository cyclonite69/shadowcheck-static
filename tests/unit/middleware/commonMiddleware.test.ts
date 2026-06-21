import { mountCommonMiddleware } from '../../../server/src/middleware/commonMiddleware';
import express from 'express';

jest.mock('compression', () => jest.fn(() => (req: any, res: any, next: any) => next()));
jest.mock('cors', () => jest.fn(() => (req: any, res: any, next: any) => next()));
jest.mock('express-rate-limit', () => jest.fn(() => (req: any, res: any, next: any) => next()));

const corsMock = require('cors');
const rateLimitMock = require('express-rate-limit');

describe('commonMiddleware', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = {
      use: jest.fn(),
    } as unknown as express.Express;
  });

  it('should mount all expected middlewares', () => {
    mountCommonMiddleware(app, { allowedOrigins: ['http://localhost:3000'] });
    expect(app.use).toHaveBeenCalled();
  });

  describe('CORS origin validation', () => {
    it('allows undefined origin (no origin)', () => {
      mountCommonMiddleware(app, { allowedOrigins: ['http://localhost:3000'] });
      const corsOptions = corsMock.mock.calls[0][0];
      const callback = jest.fn();

      corsOptions.origin(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('allows origin explicitly listed in allowedOrigins', () => {
      mountCommonMiddleware(app, {
        allowedOrigins: ['http://localhost:3000', 'https://example.com'],
      });
      const corsOptions = corsMock.mock.calls[0][0];
      const callback = jest.fn();

      corsOptions.origin('https://example.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('allows any origin when wildcard * is inside allowedOrigins', () => {
      mountCommonMiddleware(app, { allowedOrigins: ['*'] });
      const corsOptions = corsMock.mock.calls[0][0];
      const callback = jest.fn();

      corsOptions.origin('https://untrusted.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('rejects unauthorized origin with a CORS error', () => {
      mountCommonMiddleware(app, { allowedOrigins: ['http://localhost:3000'] });
      const corsOptions = corsMock.mock.calls[0][0];
      const callback = jest.fn();

      corsOptions.origin('https://untrusted.com', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = callback.mock.calls[0][0];
      expect(errorArg.message).toBe('Not allowed by CORS');
    });

    it('handles non-array allowedOrigins safely', () => {
      mountCommonMiddleware(app, { allowedOrigins: null as any });
      const corsOptions = corsMock.mock.calls[0][0];
      const callback = jest.fn();

      corsOptions.origin('https://localhost:3000', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Rate limit skip predicate', () => {
    it('skips local IP 127.0.0.1', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];
      const req = { ip: '127.0.0.1' };

      expect(rateLimitOptions.skip(req)).toBe(true);
    });

    it('skips local IPv6 ::1', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];
      const req = { ip: '::1' };

      expect(rateLimitOptions.skip(req)).toBe(true);
    });

    it('skips private/VPC IP prefix 172.31.', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];
      const req = { ip: '172.31.42.100' };

      expect(rateLimitOptions.skip(req)).toBe(true);
    });

    it('skips private/VPC IP prefix 10.', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];
      const req = { ip: '10.0.1.50' };

      expect(rateLimitOptions.skip(req)).toBe(true);
    });

    it('uses socket remoteAddress fallback when req.ip is absent', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];
      const req = {
        socket: { remoteAddress: '127.0.0.1' },
      };

      expect(rateLimitOptions.skip(req)).toBe(true);
    });

    it('does not skip public IPs', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];
      const req = { ip: '8.8.8.8' };

      expect(rateLimitOptions.skip(req)).toBe(false);
    });

    it('does not skip empty or unknown request contexts', () => {
      mountCommonMiddleware(app, { allowedOrigins: [] });
      const rateLimitOptions = rateLimitMock.mock.calls[0][0];

      expect(rateLimitOptions.skip({ socket: {} })).toBe(false);
    });
  });
});
