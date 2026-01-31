const express = require('express');
const router = express.Router();
const logger = require('../../../../logging/logger');
const { runPostgresBackup } = require('../../../../services/backupService');

// POST /api/admin/backup - Run full database backup (no auth yet)
router.post('/admin/backup', async (req, res) => {
  try {
    const result = await runPostgresBackup();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error(`[Backup] Failed to run pg_dump: ${err.message}`, { error: err });
    res.status(500).json({ ok: false, error: err.message || 'Backup failed' });
  }
});

module.exports = router;
