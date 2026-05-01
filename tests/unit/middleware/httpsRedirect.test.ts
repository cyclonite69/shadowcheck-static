export {};
import type { Request, Response, NextFunction } from 'express';
import { createHttpsRedirect } from '../../../server/src/middleware/httpsRedirect';

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    hostname: 'example.com',
    url: '/some/path',
    ...overrides,
  }) as unknown as Request;

const makeRes = () => {
  const res = {
    redirect: jest.fn(),
  } as unknown as Response;
  return res;
};

describe('createHttpsRedirect', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('redirects to https when x-forwarded-proto is http and hostname is not localhost', () => {
    const middleware = createHttpsRedirect();
    const req = makeReq({
      headers: { 'x-forwarded-proto': 'http' },
      hostname: 'example.com',
      url: '/page',
    });
    const res = makeRes();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/page');
    expect(next).not.toHaveBeenCalled();
  });

  test('redirects when x-forwarded-proto header is absent and hostname is not localhost', () => {
    const middleware = createHttpsRedirect();
    const req = makeReq({ headers: {}, hostname: 'myapp.com', url: '/api/data' });
    const res = makeRes();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://myapp.com/api/data');
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when x-forwarded-proto is https', () => {
    const middleware = createHttpsRedirect();
    const req = makeReq({
      headers: { 'x-forwarded-proto': 'https' },
      hostname: 'example.com',
      url: '/',
    });
    const res = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('calls next when hostname is localhost regardless of proto', () => {
    const middleware = createHttpsRedirect();
    const req = makeReq({
      headers: { 'x-forwarded-proto': 'http' },
      hostname: 'localhost',
      url: '/dev',
    });
    const res = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('preserves query string in redirect URL', () => {
    const middleware = createHttpsRedirect();
    const req = makeReq({ headers: {}, hostname: 'example.com', url: '/search?q=wifi&limit=10' });
    const res = makeRes();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/search?q=wifi&limit=10');
  });
});
