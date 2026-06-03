const express = require('express');
const router = express.Router();
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { spawn } = require('child_process');
const { secretsManager, adminImportHistoryService } = require('../../../../../config/container');
const logger = require('../../../../../logging/logger');
const { runAwsCliJson } = require('../../../../../services/backup/awsCli');
const {
  listKmlImportStatus,
  findKmlFilesByHashes,
} = require('../../../../../repositories/kmlImportRepository');
const {
  sanitizeRelativePath,
  parseRelativePathsPayload,
  getKmlImportHistoryContext,
  parseKmlImportCounts,
  kmlUpload,
  getKmlImportCommand,
  PROJECT_ROOT,
} = require('../../../../../services/admin/adminHelpers');

const cleanupPaths = async (paths) => {
  for (const p of paths) {
    await fs.rm(p, { force: true, recursive: true }).catch(() => {});
  }
};

const sha256File = async (filePath) => {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
};

const isForceImport = (value) => value === true || String(value || '').toLowerCase() === 'true';

router.get('/admin/kml-imports', async (req, res) => {
  try {
    const status = await listKmlImportStatus(req.query?.limit);
    res.json(status);
  } catch (err) {
    logger.error(`KML import status failed: ${err.message}`, { error: err });
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/admin/import-kml', kmlUpload.array('files', 1000), async (req, res) => {
  const uploadedFiles = req.files || [];
  if (uploadedFiles.length === 0) {
    return res.status(400).json({ ok: false, error: 'No KML files' });
  }
  const startedAt = Date.now();
  const sourceType =
    String(req.body?.source_type || 'wigle')
      .trim()
      .toLowerCase() || 'wigle';
  const uploadToS3 = req.body?.upload_to_s3 !== 'false';
  const forceImport = isForceImport(req.body?.force);
  const bucketName = String(process.env.S3_BACKUP_BUCKET || '').trim();
  const prefix = String(process.env.KML_IMPORT_PREFIX || 'imports/kml/').replace(/^\/+|\/+$/g, '');
  const batchId = `kml_${Date.now()}`;
  let relativePaths;
  try {
    relativePaths = parseRelativePathsPayload(req.body?.relative_paths);
  } catch (parseErr) {
    return res.status(400).json({ ok: false, error: parseErr.message });
  }
  const tempBatchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kml-import-'));
  const cleanupTargets = uploadedFiles.map((f) => f.path).concat(tempBatchDir);
  let historyId = 0;

  try {
    const hashedFiles = await Promise.all(
      uploadedFiles.map(async (file, index) => ({
        file,
        index,
        hash: await sha256File(file.path),
        relativePath: sanitizeRelativePath(relativePaths[index] || file.originalname),
      }))
    );
    const existingByHash = new Map();
    if (!forceImport) {
      const existingFiles = await findKmlFilesByHashes(hashedFiles.map((item) => item.hash));
      for (const existing of existingFiles) {
        existingByHash.set(existing.file_hash, existing);
      }
    }
    const skippedFiles = [];
    const importableFiles = [];

    for (const item of hashedFiles) {
      const existing = existingByHash.get(item.hash);
      if (existing) {
        skippedFiles.push({
          filename: item.relativePath,
          hash: item.hash,
          existingSourceFile: existing.source_file,
          existingImportedAt: existing.imported_at,
        });
      } else {
        importableFiles.push(item);
      }
    }

    if (importableFiles.length === 0) {
      return res.json({
        ok: true,
        importType: 'kml',
        batchId,
        filesImported: 0,
        pointsImported: 0,
        skipped: skippedFiles.length,
        skippedFiles,
        forced: forceImport,
        message: skippedFiles.length
          ? `${skippedFiles.length} duplicate KML file(s) skipped`
          : 'No KML files imported',
      });
    }

    const metricsBefore = await adminImportHistoryService.captureImportMetrics();
    const historyContext = getKmlImportHistoryContext(
      sourceType,
      importableFiles.map((item) => item.file),
      importableFiles.map((item) => item.relativePath)
    );
    historyId = await adminImportHistoryService.createImportHistoryEntry(
      historyContext.sourceTag,
      historyContext.filename,
      metricsBefore
    );
    for (const item of importableFiles) {
      const file = item.file;
      const rel = item.relativePath;
      const dest = path.join(tempBatchDir, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.rename(file.path, dest);
      if (uploadToS3 && bucketName) {
        await runAwsCliJson(['s3', 'cp', dest, `s3://${bucketName}/${prefix}/${batchId}/${rel}`]);
      }
    }
    const commandSpec = getKmlImportCommand(tempBatchDir, sourceType);
    const cmd = commandSpec.cmd || commandSpec.command;
    const { args } = commandSpec;
    const importResult = await new Promise((resolve, reject) => {
      const p = spawn(cmd, args, {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          DB_ADMIN_PASSWORD: secretsManager.get('db_admin_password') || '',
          DB_ADMIN_USER: 'shadowcheck_admin',
        },
      });
      let output = '',
        errorOutput = '';
      p.stdout.on('data', (d) => (output += d));
      p.stderr.on('data', (d) => (errorOutput += d));
      p.on('close', (code) => resolve({ code, output, errorOutput }));
      p.on('error', reject);
    });
    const durationSec = ((Date.now() - startedAt) / 1000).toFixed(2);
    if (importResult.code !== 0) {
      if (historyId) {
        await adminImportHistoryService.failImportHistory(
          historyId,
          importResult.errorOutput || `code ${importResult.code}`,
          durationSec
        );
      }
      return res.status(500).json({
        ok: false,
        error: 'KML import failed',
        output: importResult.output,
        errorOutput: importResult.errorOutput,
      });
    }
    const { filesImported, pointsImported } = parseKmlImportCounts(
      importResult.output,
      importableFiles.length
    );
    const metricsAfter = await adminImportHistoryService.captureImportMetrics();
    if (historyId) {
      await adminImportHistoryService.completeImportSuccess(
        historyId,
        pointsImported,
        Math.max(importableFiles.length - filesImported, 0),
        durationSec,
        metricsAfter
      );
    }
    res.json({
      ok: true,
      importType: 'kml',
      batchId,
      filesImported,
      pointsImported,
      skipped: skippedFiles.length,
      skippedFiles,
      forced: forceImport,
      durationSec,
      historyId,
      metricsBefore,
      metricsAfter,
      output: importResult.output,
    });
  } catch (err) {
    if (historyId) {
      await adminImportHistoryService.failImportHistory(
        historyId,
        err.message,
        ((Date.now() - startedAt) / 1000).toFixed(2)
      );
    }
    res.status(500).json({ ok: false, error: err.message });
    logger.error(`KML import failed (batch: ${batchId}): ${err.message}`, { error: err, batchId });
  } finally {
    await cleanupPaths(cleanupTargets);
  }
});

const {
  listTransactions,
  syncKmlTransactions,
} = require('../../../../../services/wigle/wigleKmlSyncService');

/**
 * GET /api/admin/wigle-kml-sync/status
 * Safe admin endpoint to check status of remote WiGLE KML sync integration.
 */
router.get('/admin/wigle-kml-sync/status', async (req, res) => {
  try {
    const wigleApiName = secretsManager.get('wigle_api_name');
    const wigleApiToken = secretsManager.get('wigle_api_token');
    const configured = Boolean(wigleApiName && wigleApiToken);

    const importStatus = await listKmlImportStatus(1);
    const fileCount = importStatus.totals.file_count;
    const pointCount = importStatus.totals.point_count;
    const latestImportedAt = importStatus.totals.latest_imported_at;

    const response = {
      configured,
      supported: configured,
      status: configured ? 'ready' : 'credentials_missing',
      message: configured
        ? 'WiGLE remote KML sync is supported.'
        : 'WiGLE API credentials are not configured.',
      recommendation: configured
        ? 'Click Sync now to import remote runs.'
        : 'Configure wigle_api_name and wigle_api_token in Settings.',
      provider: configured ? 'wigle_api_v2' : null,
      listEndpoint: configured ? '/api/v2/file/transactions' : null,
      kmlEndpoint: configured ? '/api/v2/file/kml/{transid}' : null,
      localKml: {
        fileCount,
        pointCount,
        latestImportedAt,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error(`Wiggle KML sync status failed: ${err.message}`, { error: err });
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/admin/wigle-kml-sync/transactions
 * Retrieve the user's remote uploads listing from WiGLE API.
 */
router.get('/admin/wigle-kml-sync/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const pageStart = parseInt(req.query.pageStart, 10) || 0;
    const transactions = await listTransactions(pageStart, pageStart + limit);
    res.json(transactions);
  } catch (err) {
    logger.error(`Wiggle KML transactions fetch failed: ${err.message}`, { error: err });
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/admin/wigle-kml-sync/sync
 * Sync KML runs from WiGLE.
 */
router.post('/admin/wigle-kml-sync/sync', async (req, res) => {
  try {
    const limit = parseInt(req.body.limit, 10) || 10;
    const dryRun = req.body.dryRun === true || String(req.body.dryRun).toLowerCase() === 'true';
    const force = req.body.force === true || String(req.body.force).toLowerCase() === 'true';

    const syncResult = await syncKmlTransactions({ limit, dryRun, force });
    res.json(syncResult);
  } catch (err) {
    logger.error(`Wiggle KML sync failed: ${err.message}`, { error: err });
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
