import type { Request, Response } from 'express';
import type { HandlerDeps } from '../types';

const { getUnmatchedMediaPoints } = require('../../../../../services/adminNetworkMediaService');

/**
 * Returns unmatched media photo locations as a GeoJSON FeatureCollection.
 * GET /api/v2/networks/filtered/unmatched-media
 */
export const createUnmatchedMediaHandler =
  (_deps: HandlerDeps) => async (_req: Request, res: Response) => {
    const mediaPoints = await getUnmatchedMediaPoints();

    const features = mediaPoints.map((point: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(point.exif_lon), parseFloat(point.exif_lat)],
      },
      properties: {
        id: point.id,
        bssid: point.bssid,
        filename: point.filename,
        captured_at: point.exif_captured_at,
        thumbnail_url: `/api/admin/network-media/${point.id}/inline?thumbnail=true`,
      },
    }));

    res.json({
      ok: true,
      type: 'FeatureCollection',
      features,
    });
  };
