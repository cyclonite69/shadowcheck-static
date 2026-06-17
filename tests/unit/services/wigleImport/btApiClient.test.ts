import { fetchBtPage } from '../../../../server/src/services/wigleImport/btApiClient';
import { wigleGatewayFetch } from '../../../../server/src/services/wigle/wigleGateway';
import { buildBtSearchParams } from '../../../../server/src/services/wigleImport/btParams';

jest.mock('../../../../server/src/services/wigle/wigleGateway', () => ({
  wigleGatewayFetch: jest.fn(),
}));

jest.mock('../../../../server/src/services/wigleImport/btParams', () => ({
  buildBtSearchParams: jest.fn(),
}));

jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('btApiClient', () => {
  const encodedAuth = 'dGVzdDp0ZXN0';
  const requestParams = {
    namelike: 'test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (buildBtSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ namelike: 'test' }));
  });

  it('successfully fetches a page', async () => {
    const mockJsonResponse = {
      success: true,
      results: [{ netid: '1' }],
      totalResults: 1,
    };

    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: true,
      response: {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockJsonResponse),
      },
    });

    const result = await fetchBtPage(encodedAuth, requestParams, null);

    expect(result).toEqual(mockJsonResponse);
    expect(wigleGatewayFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('bluetooth/search'),
      })
    );
  });

  it('throws error if gateway result is not ok', async () => {
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: false,
      error: 'Gateway Timeout',
      status: 504,
    });

    try {
      await fetchBtPage(encodedAuth, requestParams, null);
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toBe('Gateway Timeout');
      expect(error.status).toBe(504);
    }
  });

  it('throws error if response is not ok', async () => {
    (wigleGatewayFetch as jest.Mock).mockResolvedValue({
      ok: true,
      response: {
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Too Many Requests'),
        headers: {
          get: jest.fn().mockReturnValue('3600'),
        },
      },
    });

    try {
      await fetchBtPage(encodedAuth, requestParams, 'cursor1');
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('failed with status 429');
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe('3600');
    }
  });
});
