import { mountCommonMiddleware } from '../../../server/src/middleware/commonMiddleware';
import express from 'express';

jest.mock('compression', () => jest.fn(() => (req: any, res: any, next: any) => next()));
jest.mock('cors', () => jest.fn(() => (req: any, res: any, next: any) => next()));
jest.mock('express-rate-limit', () => jest.fn(() => (req: any, res: any, next: any) => next()));

describe('commonMiddleware', () => {
  it('should mount all expected middlewares', () => {
    const app = {
      use: jest.fn(),
    } as unknown as express.Express;

    mountCommonMiddleware(app, { allowedOrigins: ['http://localhost:3000'] });

    expect(app.use).toHaveBeenCalled();
  });
});
