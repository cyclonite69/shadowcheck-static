import * as container from '../../../config/container';
import { wigleGatewayFetch } from '../../wigle/wigleGateway';
import { getEncodedWigleAuth } from '../../wigleRequestUtils';
import { parseWigleStatsCreditSnapshot } from '../mappers/enrichmentMapper';

export type WigleApiCreditGatewayResult =
  | { ok: true; snapshot: ReturnType<typeof parseWigleStatsCreditSnapshot> }
  | { ok: false; status?: number; message: string };

/**
 * Fetch WiGLE v2 stats and parse the remaining API quota.
 */
export async function fetchWigleApiCreditSnapshot(): Promise<WigleApiCreditGatewayResult> {
  const { secretsManager } = container as any;
  const wigleApiName = secretsManager.get('wigle_api_name');
  const wigleApiToken = secretsManager.get('wigle_api_token');

  if (!wigleApiName || !wigleApiToken) {
    return { ok: false, message: 'WiGLE API credentials not configured' };
  }

  const encodedAuth = getEncodedWigleAuth();
  const gatewayResult = await wigleGatewayFetch({
    kind: 'stats',
    url: 'https://api.wigle.net/api/v2/stats',
    timeoutMs: 15000,
    maxRetries: 0,
    label: 'WiGLE API Credit Check',
    entrypoint: 'stats',
    endpointType: 'v2/stats',
    init: { headers: { Authorization: `Basic ${encodedAuth}` } },
  });

  if (!gatewayResult.ok) {
    if (gatewayResult.status === 401) {
      return { ok: false, status: 401, message: 'Invalid WiGLE API key' };
    }
    return { ok: false, status: gatewayResult.status, message: 'Credit check unavailable' };
  }

  const response = gatewayResult.response;
  if (response.status === 401) {
    return { ok: false, status: 401, message: 'Invalid WiGLE API key' };
  }

  const data = (await response.json()) as Record<string, unknown>;
  return { ok: true, snapshot: parseWigleStatsCreditSnapshot(data) };
}
