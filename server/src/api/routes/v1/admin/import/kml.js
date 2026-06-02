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
module.exports = router;
