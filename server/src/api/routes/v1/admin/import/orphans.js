const express = require('express');
const router = express.Router();
const { adminOrphanNetworksService } = require('../../../../../config/container');

/**
 * GET /api/admin/orphan-networks
 * Paginated list of orphan networks with server-side sort.
 * @param {number} [limit=50] - Page size (max 500)
 * @param {number} [offset=0] - Pagination offset
 * @param {string} [search] - ILIKE filter on bssid/ssid
 * @param {string} [sortBy] - Comma-separated sort keys (bssid|ssid|moved_at|move_reason|lasttime_ms|bestlevel|unique_days|unique_locations|observations_imported|backfill_status|last_attempted_at)
 * @param {string} [sortDir] - Comma-separated directions matching sortBy (asc|desc)
 */
router.get('/admin/orphan-networks', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = String(req.query.search || '').trim();
    const sortBy = String(req.query.sortBy || '').trim();
    const sortDir = String(req.query.sortDir || '').trim();
    const rows = await adminOrphanNetworksService.listOrphanNetworks({
      search,
      limit,
      offset,
      sortBy,
      sortDir,
    });
    const counts = await adminOrphanNetworksService.getOrphanNetworkCounts({ search });
    res.json({
      ok: true,
      total: counts.total,
      rows,
      pagination: { limit, offset, hasMore: offset + rows.length < counts.total },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/admin/orphan-networks/:bssid/check-wigle', async (req, res, next) => {
  try {
    const result = await adminOrphanNetworksService.backfillOrphanNetworkFromWigle(
      req.params.bssid
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
