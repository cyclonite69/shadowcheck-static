import { Request, Response, NextFunction } from 'express';
import { createSecurityHeaders } from '../../../server/src/middleware/securityHeaders';

describe('securityHeaders', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      setHeader: jest.fn(),
    };
    next = jest.fn();
  });

  it('should set security headers', () => {
    const middleware = createSecurityHeaders(false);
    middleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(next).toHaveBeenCalled();
  });

  it('should set HSTS if forceHttps is true', () => {
    const middleware = createSecurityHeaders(true);
    middleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      expect.stringContaining('max-age=31536000')
    );
  });
});
