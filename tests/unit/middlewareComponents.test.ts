describe('Middleware utilities', () => {
  it('provides middleware components in the middleware directory', () => {
    const fs = require('fs');
    const path = require('path');
    const middlewareDir = path.join(__dirname, '../../server/src/middleware');
    expect(fs.existsSync(middlewareDir)).toBe(true);
    const files = fs.readdirSync(middlewareDir).filter((f: string) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
  });

  it('auth middleware exports authMiddleware', () => {
    const authMiddleware = require('../../server/src/middleware/authMiddleware');
    expect(
      authMiddleware.authMiddleware || authMiddleware.requireAuth || authMiddleware.requireAdmin
    ).toBeDefined();
  });

  it('common middleware is available', () => {
    const middleware = require('../../server/src/middleware/commonMiddleware');
    expect(middleware).toBeDefined();
  });

  it('cache middleware is available', () => {
    const middleware = require('../../server/src/middleware/cacheMiddleware');
    expect(middleware).toBeDefined();
  });

  it('request ID middleware is available', () => {
    const middleware = require('../../server/src/middleware/requestId');
    expect(middleware).toBeDefined();
  });
});
