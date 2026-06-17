const mockGetFieldOfficesIndex = jest.fn();
const mockOfficeLoaderCtor = jest.fn();

jest.mock('../../../../../etl/load/fbi/scraper', () => ({
  fetchPage: jest.fn(),
  getFieldOfficesIndex: (...args: unknown[]) => mockGetFieldOfficesIndex(...args),
}));

jest.mock('../../../../../etl/load/fbi/loader', () => ({
  OfficeLoader: jest.fn().mockImplementation((pool) => {
    mockOfficeLoaderCtor(pool);
    return { upsertOffice: jest.fn() };
  }),
}));

describe('etl/load/fbi/importer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks the scraper for office paths and logs each path without network calls', async () => {
    mockGetFieldOfficesIndex.mockResolvedValue(['/detroit', '/new-york']);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const pool = { query: jest.fn() };
    const { FBIImporter } = require('../../../../../etl/load/fbi/importer');

    await new FBIImporter(pool as any).importAll();

    expect(mockOfficeLoaderCtor).toHaveBeenCalledWith(pool);
    expect(mockGetFieldOfficesIndex).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Processing /detroit...');
    expect(logSpy).toHaveBeenCalledWith('Processing /new-york...');
    logSpy.mockRestore();
  });
});
