import { Router, Request, Response } from 'express';
const { fetchShotSpotterZonesGeoJSON } = require('../../../repositories/shotspotterRepository');

const router = Router();

/**
 * GET /api/v1/surveillance/shotspotter-zones
 * Returns GeoJSON FeatureCollection of ShotSpotter deployment zones.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const geojson = await fetchShotSpotterZonesGeoJSON();
    res.json(geojson);
  } catch (error) {
    console.error('Error fetching ShotSpotter zones:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch ShotSpotter deployment zones',
    });
  }
});

export default router;
