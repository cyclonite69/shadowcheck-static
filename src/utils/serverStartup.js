/**
 * Server startup helpers.
 */

/**
 * Start the HTTP server and log configuration details.
 * @param {import('express').Express} app - Express app instance
 * @param {{ port: number, host: string, forceHttps: boolean, logger: object }} options - Startup options
 * @returns {import('http').Server} Node HTTP server
 */
function startServer(app, options) {
  const { port, host, forceHttps, logger } = options;

  return app.listen(port, host, () => {
    logger.info(`Server listening on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`HTTPS redirect: ${forceHttps ? 'enabled' : 'disabled'}`);
  });
}

module.exports = {
  startServer,
};
