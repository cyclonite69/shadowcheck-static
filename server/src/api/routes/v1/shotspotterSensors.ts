import { Router, Request, Response } from 'express';
const { shotspotterSensorsService } = require('../../../config/container');

const router = Router();

/**
 * GET /api/v1/surveillance/shotspotter-sensors
 * Returns GeoJSON FeatureCollection of ShotSpotter sensor locations (WIRED 2024 leak).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const geojson = await shotspotterSensorsService.getShotspotterSensorsGeoJSON();
    res.json(geojson);
  } catch (error) {
    console.error('Error fetching ShotSpotter sensors:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch ShotSpotter sensor locations',
    });
  }
});

export default router;
