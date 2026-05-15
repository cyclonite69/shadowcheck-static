/**
 * WiGLE Enrichment Fetcher
 * Single-item v3 detail fetch and import for the batch enrichment pipeline.
 */

import * as container from '../config/container';
import { wigleGatewayFetch } from './wigle/wigleGateway';
import { getEncodedWigleAuth } from './wigleRequestUtils';
import { inferWigleEndpoint } from './wigleDetailTransforms';
import { importObservations } from './wigleDetailService';
import {
  mapV3ApiDetailToNetworkDetail,
  normalizeMacAddress,
} from './wigleEnrichment/mappers/enrichmentMapper';

/**
 * Fetch v3 detail for a single BSSID from the WiGLE API and import it into the DB.
 * Returns null if the network was not found (404).
 * Throws on API errors or credential issues.
 */
export async function fetchAndImportDetail(
  bssid: string,
  type: string
): Promise<{ bssid: string; obsCount: number } | null> {
  const { wigleService, secretsManager } = container as any;

  const wigleApiName = secretsManager.get('wigle_api_name');
  const wigleApiToken = secretsManager.get('wigle_api_token');
  if (!wigleApiName || !wigleApiToken) throw new Error('WiGLE API credentials not configured');

  const endpoint = inferWigleEndpoint(type);
  const encodedAuth = getEncodedWigleAuth();

  const response_result = await wigleGatewayFetch({
    kind: 'detail',
    url: `https://api.wigle.net/api/v3/detail/${endpoint}/${bssid}`,
    timeoutMs: 15000,
    maxRetries: 1,
    label: 'WiGLE Batch Enrichment',
    entrypoint: 'enrichment',
    endpointType: `v3/detail/${endpoint}`,
    init: {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        Accept: 'application/json',
      },
    },
  });

  if (!response_result.ok) {
    if (response_result.status === 404) return null;
    throw Object.assign(
      new Error(`WiGLE API failed (${response_result.status}): ${response_result.error}`),
      {
        status: response_result.status,
      }
    );
  }

  const response = response_result.response;
  if (response.status === 404) return null;
  if (!response.ok) {
    const errorText = await response.text();
    throw Object.assign(new Error(`WiGLE API failed (${response.status}): ${errorText}`), {
      status: response.status,
    });
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (!data?.networkId) return null;

  const networkDetail = mapV3ApiDetailToNetworkDetail(data);
  await wigleService.importWigleV3NetworkDetail(networkDetail);

  const locationClusters = Array.isArray(data.locationClusters) ? data.locationClusters : [];
  const counts = await importObservations(networkDetail.netid, locationClusters);
  const obsCount = counts.newCount;
  const normalizedBssid = normalizeMacAddress(bssid) || networkDetail.netid;

  return { bssid: normalizedBssid, obsCount };
}
