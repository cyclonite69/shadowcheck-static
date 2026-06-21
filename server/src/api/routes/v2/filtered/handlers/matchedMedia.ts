import type { Request, Response } from 'express';
import type { HandlerDeps } from '../types';

const { getMatchedMediaPoints } = require('../../../../../services/adminNetworkMediaService');

/**
 * Returns matched media locations as a GeoJSON FeatureCollection grouped by sibling component.
 * GET /api/v2/networks/filtered/matched-media
 */
export const createMatchedMediaHandler =
  (_deps: HandlerDeps) => async (_req: Request, res: Response) => {
    const mediaPoints = await getMatchedMediaPoints();

    const features = mediaPoints.map((point: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(point.lon), parseFloat(point.lat)],
      },
      properties: {
        component_id: point.component_id,
        media_count: point.media_count,
        media_ids: point.media_ids || [],
        member_bssids: point.member_bssids || [],
        location_provenance: point.location_provenance || 'component_location',
        location_confidence: null,
      },
    }));

    res.json({
      ok: true,
      type: 'FeatureCollection',
      features,
    });
  };
