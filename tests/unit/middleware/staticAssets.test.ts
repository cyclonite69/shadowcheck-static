describe('server/src/middleware/staticAssets', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mounts immutable hashed assets, vendor docs, and no-cache index handling', () => {
    const staticMock = jest.fn((root: string, options: Record<string, unknown>) => ({
      root,
      options,
    }));
    jest.doMock('express', () => ({
      __esModule: true,
      default: { static: staticMock },
      static: staticMock,
    }));

    jest.isolateModules(() => {
      const { mountStaticAssets } = require('../../../server/src/middleware/staticAssets');
      const app = { use: jest.fn() };
      mountStaticAssets(app, '/dist');

      expect(app.use).toHaveBeenNthCalledWith(
        1,
        '/assets',
        expect.objectContaining({
          root: expect.stringContaining('/dist/assets'),
          options: expect.objectContaining({ maxAge: '1y', immutable: true, etag: false }),
        })
      );
      expect(app.use).toHaveBeenNthCalledWith(
        2,
        '/vendor-docs',
        expect.objectContaining({
          root: expect.stringContaining('docs/references/vendor_docs'),
          options: expect.objectContaining({ maxAge: '1d', etag: true }),
        })
      );

      const fallbackOptions = staticMock.mock.calls[2][1] as {
        setHeaders: (res: { setHeader: jest.Mock }, path: string) => void;
      };
      const res = { setHeader: jest.fn() };
      fallbackOptions.setHeaders(res, '/dist/index.html');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-store, must-revalidate'
      );

      const resOther = { setHeader: jest.fn() };
      fallbackOptions.setHeaders(resOther, '/dist/main.js');
      expect(resOther.setHeader).not.toHaveBeenCalled();

      expect(staticMock.mock.calls[2][0]).toBe('/dist');
      expect(staticMock.mock.calls[2][1]).toMatchObject({ maxAge: 0, etag: true });
    });
  });
});
