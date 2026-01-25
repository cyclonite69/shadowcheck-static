/**
 * Register process shutdown handlers.
 * @param {{ logger: any, pool: import('pg').Pool }} deps - Dependencies
 */
function registerShutdownHandlers({ logger, pool }) {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server gracefully...');
    const BackgroundJobsService = require('../services/backgroundJobsService');
    BackgroundJobsService.shutdown();
    await pool.end();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing server gracefully...');
    await pool.end();
    process.exit(0);
  });
}

module.exports = { registerShutdownHandlers };
