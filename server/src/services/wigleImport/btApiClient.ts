import logger from '../../logging/logger';
import { buildBtSearchParams, type WigleBtImportParams } from './btParams';
import { wigleGatewayFetch } from '../wigle/wigleGateway';

export interface WigleBtPageResponse {
  success?: boolean;
  totalResults?: number;
  search_after?: string | null;
  results?: any[];
}

/**
 * Fetch a single page from the WiGLE Bluetooth search API.
 * Uses the gateway for rate-limit accounting but skips WiFi-specific param validation
 * since the BT endpoint accepts a different parameter set.
 */
export const fetchBtPage = async (
  encodedAuth: string,
  requestParams: WigleBtImportParams,
  searchAfter: string | null
): Promise<WigleBtPageResponse> => {
  const params = buildBtSearchParams(requestParams, searchAfter);
  logger.info('[WiGLE BT Import] Fetch page request', { searchAfter: searchAfter || null });

  const apiUrl = `https://api.wigle.net/api/v2/bluetooth/search?${params.toString()}`;

  const gatewayResult = await wigleGatewayFetch({
    kind: 'search',
    url: apiUrl,
    timeoutMs: 30000,
    maxRetries: 0,
    label: 'WiGLE BT Search API',
    entrypoint: 'bt-import-run',
    endpointType: 'v2/bluetooth/search',
    query_source: 'import',
    // searchParams intentionally omitted — BT endpoint has a different param spec
    init: {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        Accept: 'application/json',
      },
    },
  });

  if (!gatewayResult.ok) {
    const error: any = new Error(gatewayResult.error);
    error.status = gatewayResult.status;
    throw error;
  }

  const response = gatewayResult.response;

  if (!response.ok) {
    const errorText = await response.text();
    const retryAfterRaw = response.headers.get('Retry-After');
    const error: any = new Error(`WiGLE BT API request failed with status ${response.status}`);
    error.status = response.status;
    error.details = errorText;
    error.retryAfter = retryAfterRaw;
    throw error;
  }

  logger.info(`[WiGLE BT Import] Request succeeded | url=${apiUrl}`);
  return response.json() as Promise<WigleBtPageResponse>;
};
