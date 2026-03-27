export {};
const express = require('express');
const router = express.Router();
const { settingsAdminService } = require('../../../../config/container');
const { backgroundJobsService } = require('../../../../config/container');
const logger = require('../../../../logging/logger');

const envFlag = (value: unknown, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

/**
 * GET /api/admin/settings
 * Get all settings
 */
router.get('/', async (req: any, res: any) => {
  try {
    const rows = await settingsAdminService.getAllSettings();
    const settings: any = {};
    rows.forEach((row: any) => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
        updatedAt: row.updated_at,
      };
    });
    res.json({ success: true, settings });
  } catch (error: any) {
    logger.error('Failed to get settings', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/settings/jobs/status
 * Get background job runtime status and recent history
 */
router.get('/jobs/status', async (req: any, res: any) => {
  try {
    const status = await backgroundJobsService.getJobStatus();
    res.json({ success: true, ...status });
  } catch (error: any) {
    logger.error('Failed to get background job status', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/jobs/:jobName/run', async (req: any, res: any) => {
  try {
    const { jobName } = req.params;

    if (!['backup', 'mlScoring', 'mvRefresh'].includes(jobName)) {
      return res.status(400).json({ success: false, error: 'Unsupported background job' });
    }

    const result = await backgroundJobsService.runJobNow(jobName);
    const status = await backgroundJobsService.getJobStatus();
    res.json({ success: true, result, ...status });
  } catch (error: any) {
    logger.error('Failed to run background job manually', {
      error: error.message,
      jobName: req.params.jobName,
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/runtime', async (req: any, res: any) => {
  try {
    res.json({
      success: true,
      featureFlags: {
        adminAllowDocker: envFlag(process.env.ADMIN_ALLOW_DOCKER, false),
        adminAllowMlTraining: envFlag(process.env.ADMIN_ALLOW_ML_TRAINING, true),
        adminAllowMlScoring: envFlag(process.env.ADMIN_ALLOW_ML_SCORING, true),
        enableBackgroundJobs: envFlag(process.env.ENABLE_BACKGROUND_JOBS, false),
        apiGateEnabled: envFlag(process.env.API_GATE_ENABLED ?? 'true', true),
        forceHttps: envFlag(process.env.FORCE_HTTPS, false),
        cookieSecure: envFlag(process.env.COOKIE_SECURE, false),
        simpleRuleScoringEnabled: envFlag(process.env.SIMPLE_RULE_SCORING_ENABLED, false),
        trackQueryPerformance: envFlag(process.env.TRACK_QUERY_PERFORMANCE, false),
        debugQueryPerformance: envFlag(process.env.DEBUG_QUERY_PERFORMANCE, false),
        debugGeospatial: envFlag(process.env.DEBUG_GEOSPATIAL, false),
      },
      runtime: {
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info',
        mlModelVersion: process.env.ML_MODEL_VERSION || '1.0.0',
        mlScoreLimit: parseInt(process.env.ML_SCORE_LIMIT ?? '0', 10) || 100,
        mlAutoScoreLimit: parseInt(process.env.ML_AUTO_SCORE_LIMIT ?? '0', 10) || 1000,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get runtime settings', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/settings/:key
 * Get a specific setting
 */
router.get('/:key', async (req: any, res: any) => {
  try {
    const { key } = req.params;
    const setting = await settingsAdminService.getSettingByKey(key);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }
    res.json({ success: true, key, ...setting });
  } catch (error: any) {
    logger.error('Failed to get setting', { error: error.message, key: req.params.key });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Update a setting
 */
router.put('/:key', async (req: any, res: any) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Value is required' });
    }

    const setting = await settingsAdminService.updateSetting(key, value);

    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    if (['backup_job_config', 'ml_scoring_job_config', 'mv_refresh_job_config'].includes(key)) {
      if (backgroundJobsService.isSchedulerEnabled()) {
        await backgroundJobsService.rescheduleJobs();
      } else {
        logger.info('Background job config updated while scheduler is disabled', { key });
      }
    }

    logger.info('Setting updated', { key, value });
    res.json({ success: true, setting });
  } catch (error: any) {
    logger.error('Failed to update setting', { error: error.message, key: req.params.key });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/settings/ml-blending/toggle
 * Quick toggle for ML blending
 */
router.post('/ml-blending/toggle', async (req: any, res: any) => {
  try {
    const newValue = await settingsAdminService.toggleMLBlending();
    logger.info('ML blending toggled', { enabled: newValue });
    res.json({ success: true, ml_blending_enabled: newValue });
  } catch (error: any) {
    logger.error('Failed to toggle ML blending', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
