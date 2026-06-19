import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as https from 'https';
import {
  reverseGeocode,
  processBatch,
  main,
} from '../../../scripts/geocoding/reverse-geocode-parallel';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('https');

describe('reverse-geocode-parallel', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null | undefined): never => {
        throw new Error(`Process.exit called with: ${code}`);
      });
    originalArgv = [...process.argv];
    originalEnv = { ...process.env };
    process.env.MAPBOX_TOKEN = 'test-token';

    // Mock setTimeout to run callbacks immediately to avoid test timeouts
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  const mockHttpsGet = (responseBody: string, statusCode = 200, error?: Error) => {
    return jest.spyOn(https, 'get').mockImplementation((url: any, cb?: any) => {
      const resMock: any = {
        statusCode,
        on: jest.fn((event, eventCb) => {
          if (event === 'data' && !error) {
            eventCb(responseBody);
          }
          if (event === 'end' && !error) {
            eventCb();
          }
          return resMock;
        }),
      };
      if (cb) {
        cb(resMock);
      }
      const reqMock: any = {
        on: jest.fn((event, eventCb) => {
          if (event === 'error' && error) {
            eventCb(error);
          }
          return reqMock;
        }),
      };
      return reqMock;
    });
  };

  describe('reverseGeocode', () => {
    it('returns place_name if Mapbox returns features', async () => {
      const mockJson = JSON.stringify({
        features: [{ place_name: 'Parallel Place' }],
      });
      mockHttpsGet(mockJson);

      const result = await reverseGeocode('42.12', '-83.45', 'token');
      expect(result).toEqual({ address: 'Parallel Place' });
    });

    it('returns null address if no features', async () => {
      mockHttpsGet(JSON.stringify({ features: [] }));
      const result = await reverseGeocode('42.12', '-83.45', 'token');
      expect(result).toEqual({ address: null });
    });

    it('rejects on HTTP error', async () => {
      mockHttpsGet('', 500, new Error('HTTP Error'));
      await expect(reverseGeocode('42.12', '-83.45', 'token')).rejects.toThrow('HTTP Error');
    });
  });

  describe('processBatch', () => {
    it('processes locations in batches up to concurrency limit', async () => {
      const locations = [
        { lat: '1', lon: '2', tag: 'A' },
        { lat: '3', lon: '4', tag: 'B' },
      ];

      const mockJson = JSON.stringify({ features: [{ place_name: 'Success' }] });
      mockHttpsGet(mockJson);

      const results = await processBatch(locations, 0, 2, 'token');
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ lat: '1', lon: '2', tag: 'A', address: 'Success', index: 0 });
      expect(results[1]).toEqual({ lat: '3', lon: '4', tag: 'B', address: 'Success', index: 1 });
    });

    it('handles geocoding errors gracefully inside processBatch', async () => {
      const locations = [{ lat: '1', lon: '2' }];
      mockHttpsGet('', 500, new Error('Fatal'));

      const results = await processBatch(locations, 0, 1, 'token');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ lat: '1', lon: '2', address: null, index: 0 });
    });
  });

  describe('main', () => {
    it('exits if MAPBOX_TOKEN is missing', async () => {
      delete process.env.MAPBOX_TOKEN;
      await expect(main()).rejects.toThrow('Process.exit called with: 1');
      expect(errorSpy).toHaveBeenCalledWith('❌ MAPBOX_TOKEN not found in .env');
    });

    it('exits if input file is missing', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      process.argv = ['node', 'script.js', 'missing.csv'];
      await expect(main()).rejects.toThrow('Process.exit called with: 1');
      expect(errorSpy).toHaveBeenCalledWith('❌ Input file not found: missing.csv');
    });

    it('handles empty input file', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue('');
      process.argv = ['node', 'script.js', 'empty.csv', 'out.csv'];

      await main();
      expect(writeFileSync).toHaveBeenCalledWith('out.csv', 'address');
    });

    it('processes batch successfully and writes output', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue('lat,lon,id\n42.12,-83.45,1\n42.13,-83.46,2\n');
      process.argv = ['node', 'script.js', 'in.csv', 'out.csv'];

      const mockJson = JSON.stringify({ features: [{ place_name: 'Geocoded Address' }] });
      mockHttpsGet(mockJson);

      await main();

      expect(writeFileSync).toHaveBeenCalledWith(
        'out.csv',
        'lat,lon,id,address\n42.12,-83.45,1,"Geocoded Address"\n42.13,-83.46,2,"Geocoded Address"'
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Complete: 2/2'));
    });
  });
});
