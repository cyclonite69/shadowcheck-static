describe('scripts/generate-sitemap.js', () => {
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

  it('writes configured routes with default base URL', () => {
    const writeFileSync = jest.fn();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.doMock('fs', () => ({ writeFileSync }));

    jest.isolateModules(() => {
      require('../../../scripts/generate-sitemap.js');
    });

    const [outputPath, sitemap] = writeFileSync.mock.calls[0];
    expect(outputPath).toEqual(expect.stringContaining('client/public/sitemap.xml'));
    expect(sitemap).toContain('<loc>https://yoursite.com/dashboard</loc>');
    expect(sitemap).toContain('<changefreq>daily</changefreq>');
    expect(sitemap).toContain('<priority>1.0</priority>');
    expect(logSpy).toHaveBeenCalledWith('[generate-sitemap] Generated sitemap with 11 pages');
  });

  it('honors SITE_URL for every route', () => {
    process.env.SITE_URL = 'https://shadowcheck.example';
    const writeFileSync = jest.fn();
    jest.doMock('fs', () => ({ writeFileSync }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require('../../../scripts/generate-sitemap.js');
    });

    const sitemap = writeFileSync.mock.calls[0][1] as string;
    expect(sitemap).toContain('<loc>https://shadowcheck.example/</loc>');
    expect(sitemap).toContain('<loc>https://shadowcheck.example/wigle</loc>');
    expect(sitemap).not.toContain('https://yoursite.com');
  });
});
