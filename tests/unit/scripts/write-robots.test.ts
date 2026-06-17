describe('scripts/write-robots.js', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('writes disallow robots.txt by default', () => {
    const writeFileSync = jest.fn();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.doMock('fs', () => ({ writeFileSync }));

    jest.isolateModules(() => {
      require('../../../scripts/write-robots.js');
    });

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('client/public/robots.txt'),
      'User-agent: *\nDisallow: /'
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Generated robots.txt (indexing: DISALLOWED)')
    );
  });

  it('allows indexing in production and uses SITE_URL', () => {
    process.env.NODE_ENV = 'production';
    process.env.SITE_URL = 'https://shadowcheck.example';
    const writeFileSync = jest.fn();
    jest.doMock('fs', () => ({ writeFileSync }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require('../../../scripts/write-robots.js');
    });

    expect(writeFileSync.mock.calls[0][1]).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://shadowcheck.example/sitemap.xml'
    );
  });
});
