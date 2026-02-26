import express, { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { requireAdmin } from '../../../middleware/authMiddleware';
import { DataQualityAdminService } from '../../../services/admin/dataQualityAdminService';
const container = require('../../../config/container');

const router = express.Router();

// GET /api/admin/data-quality/stats
router.get(
  '/stats',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const service: DataQualityAdminService = container.dataQualityAdminService;
    const stats = await service.getQualityStats();
    res.json({ ok: true, stats });
  })
);

// GET /api/admin/data-quality/config
router.get(
  '/config',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const service: DataQualityAdminService = container.dataQualityAdminService;
    const config = await service.getQualityConfig();
    res.json({ ok: true, config });
  })
);

// PUT /api/admin/data-quality/config
router.put(
  '/config',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const service: DataQualityAdminService = container.dataQualityAdminService;
    await service.updateQualityConfig(req.body);
    res.json({ ok: true, message: 'Quality filter config updated' });
  })
);

// POST /api/admin/data-quality/apply
router.post(
  '/apply',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const service: DataQualityAdminService = container.dataQualityAdminService;
    const stats = await service.applyQualityFilters();
    res.json({
      ok: true,
      message: 'Quality filters applied',
      stats,
    });
  })
);

// POST /api/admin/data-quality/clear
router.post(
  '/clear',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const service: DataQualityAdminService = container.dataQualityAdminService;
    await service.clearQualityFlags();
    res.json({ ok: true, message: 'Quality flags cleared' });
  })
);

export default router;
