import axios from 'axios';
import { fetchPage, getFieldOfficesIndex } from '../../../../../etl/load/fbi/scraper';

jest.mock('axios');

describe('fbi/scraper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('fetchPage', () => {
    it('uses Jina prefix by default when USE_JINA is not false', async () => {
      process.env.FBI_USE_JINA = 'true';
      const mockHtml = '<html><body>FBI</body></html>';
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockHtml });

      const url = 'https://www.fbi.gov/contact-us/test';
      const result = await fetchPage(url);

      expect(result).toBe(mockHtml);
      expect(axios.get).toHaveBeenCalledWith(`https://r.jina.ai/${url}`, { timeout: 10000 });
    });

    it('does not use Jina prefix when USE_JINA is false', async () => {
      process.env.FBI_USE_JINA = 'false';
      let fetchPageIsolated: typeof fetchPage;
      jest.isolateModules(() => {
        fetchPageIsolated = require('../../../../../etl/load/fbi/scraper').fetchPage;
      });

      const mockHtml = '<html><body>No Jina</body></html>';
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockHtml });

      const url = 'https://www.fbi.gov/contact-us/test';
      const result = await fetchPageIsolated!(url);

      expect(result).toBe(mockHtml);
      expect(axios.get).toHaveBeenCalledWith(url, { timeout: 10000 });
    });

    it('throws error when axios get fails', async () => {
      process.env.FBI_USE_JINA = 'false';
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Timeout'));

      const url = 'https://www.fbi.gov/contact-us/test';
      await expect(fetchPage(url)).rejects.toThrow(
        'Failed to fetch https://www.fbi.gov/contact-us/test: Network Timeout'
      );
    });
  });

  describe('getFieldOfficesIndex', () => {
    it('fetches index page and returns hardcoded offices', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: 'index page' });

      const result = await getFieldOfficesIndex();
      expect(result).toEqual([
        '/contact-us/field-offices/albany',
        '/contact-us/field-offices/atlanta',
      ]);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/contact-us/field-offices/field-offices'),
        expect.any(Object)
      );
    });
  });
});
