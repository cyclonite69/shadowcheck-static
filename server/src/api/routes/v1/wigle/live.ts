/**
 * WiGLE Live API Routes
 * Real-time lookups against WiGLE API
 */

import express from 'express';
const router = express.Router();
import secretsManager from '../../../../services/secretsManager';
import logger from '../../../../logging/logger';
import { wigleGatewayFetch } from '../../../../services/wigle/wigleGateway';
import { getEncodedWigleAuth } from '../../../../services/wigleRequestUtils';
import { macParamMiddleware } from '../../../../validation/middleware';

import type { Request, Response, NextFunction } from 'express';

/**
 * GET /live/:bssid - Query live WiGLE API for network
 */
router.get(
  '/live/:bssid',
  macParamMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bssid } = req.params;
      const bssidStr = Array.isArray(bssid) ? bssid[0] : bssid;
      const wigleApiName = secretsManager.get('wigle_api_name');
      const wigleApiToken = secretsManager.get('wigle_api_token');

      if (!wigleApiName || !wigleApiToken) {
        return res.status(503).json({ error: 'WiGLE API credentials not configured' });
      }

      const encodedAuth = getEncodedWigleAuth();
      logger.info(`[WiGLE] Querying for BSSID: ${bssidStr}`);

      const gatewayResult = await wigleGatewayFetch({
        kind: 'detail',
        url: `https://api.wigle.net/api/v3/detail/wifi/${encodeURIComponent(bssidStr)}`,
        timeoutMs: 10000,
        maxRetries: 1,
        label: 'WiGLE Live API',
        entrypoint: 'live-route',
        endpointType: 'v3/detail/wifi',
        init: {
          headers: {
            Authorization: `Basic ${encodedAuth}`,
            Accept: 'application/json',
          },
        },
      });

      if (!gatewayResult.ok) {
        return res.status(gatewayResult.status ?? 500).json({
          error: 'WiGLE API request failed',
          details: gatewayResult.error,
        });
      }

      const response = gatewayResult.response;
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[WiGLE] API error ${response.status}: ${errorText}`);
        return res.status(response.status).json({
          error: 'WiGLE API request failed',
          status: response.status,
          details: errorText,
        });
      }

      const data: any = await response.json();
      logger.info(`[WiGLE] Got v3 detail for ${bssid}: networkId=${data.networkId || 'none'}`);

      res.json({
        success: true,
        network: data.networkId ? data : null,
      });
    } catch (err: any) {
      logger.error(`[WiGLE] Error: ${err.message}`, { error: err });
      next(err);
    }
  }
);

export default router;
