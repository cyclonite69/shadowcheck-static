/**
 * Unit tests for wigleEnrichmentFetcher
 */

import { fetchAndImportDetail } from '../../server/src/services/wigleEnrichmentFetcher';
import * as container from '../../server/src/config/container';
import { wigleGatewayFetch } from '../../server/src/services/wigle/wigleGateway';
import { getEncodedWigleAuth } from '../../server/src/services/wigleRequestUtils';
import { inferWigleEndpoint } from '../../server/src/services/wigleDetailTransforms';

jest.mock('../../server/src/config/container', () => ({
  wigleService: {
    importWigleV3NetworkDetail: jest.fn(),
    importWigleV3Observation: jest.fn(),
  },
  secretsManager: {
    get: jest.fn(),
  },
}));

jest.mock('../../server/src/services/wigle/wigleGateway');
jest.mock('../../server/src/services/wigleRequestUtils');
jest.mock('../../server/src/services/wigleDetailTransforms');

describe('wigleEnrichmentFetcher', () => {
  const bssid = 'AA:BB:CC:DD:EE:FF';
  const type = 'wifi';
  const { wigleService, secretsManager } = container as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws error if credentials are not configured', async () => {
    secretsManager.get.mockReturnValue(null);

    await expect(fetchAndImportDetail(bssid, type)).rejects.toThrow(
      'WiGLE API credentials not configured'
    );
  });

  it('returns null if WiGLE returns 404 (via gateway result)', async () => {
    secretsManager.get.mockReturnValue('val');
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Not Found',
    });

    const result = await fetchAndImportDetail(bssid, type);
    expect(result).toBeNull();
  });

  it('returns null if WiGLE returns 404 (via response status)', async () => {
    secretsManager.get.mockReturnValue('val');
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: true,
      response: {
        ok: false,
        status: 404,
      },
    });

    const result = await fetchAndImportDetail(bssid, type);
    expect(result).toBeNull();
  });

  it('throws error on other API failures', async () => {
    secretsManager.get.mockReturnValue('val');
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Internal Server Error',
    });

    await expect(fetchAndImportDetail(bssid, type)).rejects.toThrow('WiGLE API failed (500)');
  });

  it('fetches and imports detail successfully', async () => {
    const mockData = {
      networkId: bssid,
      name: 'TestNet',
      locationClusters: [
        {
          clusterSsid: 'SSID1',
          locations: [{ ssid: 'S1' }, { ssid: 'S2' }],
        },
      ],
    };

    secretsManager.get.mockReturnValue('val');
    (inferWigleEndpoint as jest.Mock).mockReturnValue('wifi');
    (getEncodedWigleAuth as jest.Mock).mockReturnValue('auth');
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: true,
      response: {
        ok: true,
        status: 200,
        json: async () => mockData,
      },
    });

    wigleService.importWigleV3NetworkDetail.mockResolvedValue(undefined);
    wigleService.importWigleV3Observation.mockResolvedValue(1);

    const result = await fetchAndImportDetail(bssid, type);

    expect(result).toEqual({ bssid, obsCount: 2 });
    expect(wigleService.importWigleV3NetworkDetail).toHaveBeenCalled();
    expect(wigleService.importWigleV3Observation).toHaveBeenCalledTimes(2);
  });

  it('continues if individual observation import fails', async () => {
    const mockData = {
      networkId: bssid,
      locationClusters: [
        {
          locations: [{}, {}],
        },
      ],
    };

    secretsManager.get.mockReturnValue('val');
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: true,
      response: {
        ok: true,
        status: 200,
        json: async () => mockData,
      },
    });

    wigleService.importWigleV3NetworkDetail.mockResolvedValue(undefined);
    wigleService.importWigleV3Observation
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error('Failed'));

    const result = await fetchAndImportDetail(bssid, type);

    expect(result).toEqual({ bssid, obsCount: 1 });
  });
});
