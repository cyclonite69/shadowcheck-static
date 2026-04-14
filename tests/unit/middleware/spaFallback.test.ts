import { Request, Response } from 'express';
import { createSpaFallback } from '../../../server/src/middleware/spaFallback';

describe('spaFallback', () => {
  let req: { path: string };
  let res: Partial<Response>;

  beforeEach(() => {
    req = { path: '/' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendFile: jest.fn(),
    };
  });

  it('should return 404 for API paths', () => {
    req.path = '/api/test';
    const middleware = createSpaFallback('/dist');
    middleware(req as unknown as Request, res as Response, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should send index.html for other paths', () => {
    req.path = '/some/random/route';
    const middleware = createSpaFallback('/dist');
    middleware(req as unknown as Request, res as Response, jest.fn());
    expect(res.sendFile).toHaveBeenCalled();
  });
});
