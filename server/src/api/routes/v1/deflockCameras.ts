import { Router, Request, Response } from 'express';
const { deflockService } = require('../../../config/container');

const router = Router();

/**
 * GET /api/v1/surveillance/deflock-cameras
 * Returns GeoJSON FeatureCollection of DeFlock (Flock Safety ALPR) camera locations.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const geojson = await deflockService.getDeflockCamerasGeoJSON();
    res.json(geojson);
  } catch (error) {
    console.error('Error fetching DeFlock cameras:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch DeFlock camera locations',
    });
  }
});

export default router;
