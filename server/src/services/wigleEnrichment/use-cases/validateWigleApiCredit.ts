import * as container from '../../../config/container';
import logger from '../../../logging/logger';
import { wigleGatewayFetch } from '../../wigle/wigleGateway';
import { getEncodedWigleAuth } from '../../wigleRequestUtils';

/**
 * Validate that the configured WiGLE account still has API credit.
 */
export async function validateWigleApiCredit() {
  const { secretsManager } = container as any;

  try {
    const wigleApiName = secretsManager.get('wigle_api_name');
    const wigleApiToken = secretsManager.get('wigle_api_token');

    if (!wigleApiName || !wigleApiToken) {
      return { hasCredit: false, message: 'WiGLE API credentials not configured' };
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
        return { hasCredit: false, message: 'Invalid WiGLE API key' };
      }
      return { hasCredit: false, message: gatewayResult.error };
    }

    const response = gatewayResult.response;
    if (response.status === 401) {
      return { hasCredit: false, message: 'Invalid WiGLE API key' };
    }

    const data = (await response.json()) as any;
    const remaining = data?.estimatedApiQuotaRemaining || 0;

    if (remaining === 0) {
      return { hasCredit: false, message: 'No API credit remaining (0 requests)' };
    }
    if (remaining < 10) {
      logger.warn(`[WiGLE] Low API credit: ${remaining} requests remaining`);
    }

    return { hasCredit: true, message: `${remaining} requests available` };
  } catch (err) {
    logger.error('[WiGLE] Error checking API credit:', err);
    return { hasCredit: true, message: 'Credit check unavailable (proceeding with request)' };
  }
}
