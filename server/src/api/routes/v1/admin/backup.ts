const express = require('express');
const router = express.Router();
const logger = require('../../../../logging/logger');
const { runPostgresBackup } = require('../../../../services/backupService');

export {};

// POST /api/admin/backup - Run full database backup (no auth yet)
router.post('/admin/backup', async (req, res) => {
  try {
    const { uploadToS3 = false } = req.body;
    const result = await runPostgresBackup({ uploadToS3 });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error(`[Backup] Failed to run pg_dump: ${err.message}`, { error: err });
    res.status(500).json({ ok: false, error: err.message || 'Backup failed' });
  }
});

module.exports = router;
