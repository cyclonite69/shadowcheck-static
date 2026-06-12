import type { Request, Response } from 'express';
import { ROUTE_CONFIG } from '../../../config/routeConfig';

const express = require('express');
const router = express.Router();
const { v2Service, adminNetworkMediaService } = require('../../../config/container');
const { asyncHandler } = require('../../../utils/asyncHandler');
const { validators } = require('../../../utils/validators');

const NETWORK_SORT_COLS = ['observed_at', 'bssid', 'ssid', 'threat_score_v2', 'bestlevel'];

router.get(
  '/v2/networks',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = validators.limit(req.query.limit as string, 1, ROUTE_CONFIG.maxPageSize, 500);
    const offset = validators.offset(req.query.offset as string);
    const search = validators.search(req.query.search as string);
    const sort = validators.sort(req.query.sort as string, NETWORK_SORT_COLS);
    const order = validators.order(req.query.order as string);

    const result = await v2Service.listNetworks({ limit, offset, search, sort, order });
    res.json(result);
  })
);

router.get(
  '/v2/networks/:bssid',
  asyncHandler(async (req: Request, res: Response) => {
    const bssid = String(req.params.bssid || '').toUpperCase();
    const result = await v2Service.getNetworkDetail(bssid);
    res.json(result);
  })
);

router.get(
  '/v2/dashboard/metrics',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await v2Service.getDashboardMetrics();
    res.json(result);
  })
);

router.get(
  '/v2/threats/map',
  asyncHandler(async (req: Request, res: Response) => {
    const severity = validators.search(req.query.severity as string).toLowerCase();
    const days = validators.limit(req.query.days as string, 1, 180, 30);
    const result = await v2Service.getThreatMapData({ severity, days });
    res.json(result);
  })
);

router.post(
  '/v2/networks/batch',
  asyncHandler(async (req: Request, res: Response) => {
    let bssids: string[] = [];
    if (req.body && Array.isArray(req.body.bssids)) {
      bssids = req.body.bssids
        .map((b: any) =>
          String(b || '')
            .trim()
            .toUpperCase()
        )
        .filter((b: string) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(b));
    }
    // Deduplicate
    bssids = Array.from(new Set(bssids));
    // Cap at 500
    if (bssids.length > 500) {
      bssids = bssids.slice(0, 500);
    }

    const locationMode = String(req.query.locationMode || 'latest_observation');
    const result = await v2Service.getNetworksByBssids(bssids, locationMode);

    // Identify which requested BSSIDs are missing from explorer rows
    const foundBssids = new Set(result.map((r: any) => r.bssid.toUpperCase()));
    const missingBssids = bssids.filter((b) => !foundBssids.has(b));

    // Query database to check if missing BSSIDs exist in app.networks
    const existingDbBssids = await v2Service.checkNetworksExist(missingBssids);
    const existingDbSet = new Set(existingDbBssids);

    // Classify each missing BSSID
    const unresolved: Record<string, 'non_renderable' | 'missing'> = {};
    for (const b of missingBssids) {
      if (existingDbSet.has(b)) {
        unresolved[b] = 'non_renderable';
      } else {
        unresolved[b] = 'missing';
      }
    }

    res.json({ data: result, unresolved });
  })
);

/**
 * Serve network media thumbnail inline under user permissions
 * GET /api/v2/networks/media/:id/thumbnail
 *
 * @param {string} req.params.id Media record ID
 */
router.get(
  '/v2/networks/media/:id/thumbnail',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const media = await adminNetworkMediaService.getNetworkMediaThumbnail(id);

    if (!media) {
      return res.status(404).json({
        error: { message: 'Media not found' },
      });
    }

    if (!media.thumbnail) {
      return res.status(404).json({
        error: { message: 'Thumbnail not found' },
      });
    }

    res.set({
      'Content-Type': media.mime_type || 'image/jpeg',
      'Content-Disposition': 'inline',
    });

    res.send(media.thumbnail);
  })
);

module.exports = router;
