import logger from '../logging/logger';
import { logWigleAuditEvent } from './wigleAuditLogger';
import { fetchWigle } from './wigleClient';
import { hashRecord, normalizeParams } from './wigleRequestUtils';
import { getCachedSearchResponse, setCachedSearchResponse } from './wigleSearchCache';

export {};

type SearchEntryPoint = 'manual-search' | 'import-run';

async function fetchWigleSearchPage(options: {
  encodedAuth: string;
  apiVer: 'v2' | 'v3';
  params: URLSearchParams;
  entrypoint: SearchEntryPoint;
}) {
  const { encodedAuth, apiVer, params, entrypoint } = options;
  const paramsHash = hashRecord({ apiVer, params: normalizeParams(params) });
  const cached = getCachedSearchResponse(paramsHash);

  if (cached) {
    logger.info('[WiGLE] Serving search response from in-memory cache', {
      apiVer,
      entrypoint,
      paramsHash,
    });
    logWigleAuditEvent({
      entrypoint,
      endpointType: `${apiVer}/network/search`,
      paramsHash,
      status: 'CACHE_HIT',
      latencyMs: 0,
      servedFromCache: true,
      retryCount: 0,
      kind: 'search',
    });
    return cached;
  }

  const apiUrl = `https://api.wigle.net/api/${apiVer}/network/search?${params.toString()}`;

  logger.info(`[WiGLE] Searching API (${apiVer}): ${apiUrl.replace(/netid=[^&]+/, 'netid=***')}`);

  const response = await fetchWigle({
    kind: 'search',
    url: apiUrl,
    timeoutMs: 30000,
    maxRetries: 1,
    label: 'WiGLE Search API',
    entrypoint,
    paramsHash,
    endpointType: `${apiVer}/network/search`,
    init: {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        Accept: 'application/json',
      },
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error: any = new Error(`WiGLE API request failed with status ${response.status}`);
    error.status = response.status;
    error.details = errorText;
    throw error;
  }

  const data = await response.json();
  setCachedSearchResponse(paramsHash, data);
  return data;
}

export { fetchWigleSearchPage };
