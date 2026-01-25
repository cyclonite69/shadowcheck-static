/**
 * Database initialization helper.
 * @param {{ pool: import('pg').Pool, testConnection: () => Promise<void>, logger: any }} deps
 * @returns {Promise<void>} Resolves after successful connection test
 */
async function initializeDatabase({ pool, testConnection, logger }) {
  pool.on('connect', (client) => {
    logger.debug(`Pool connected: ${client.host}:${client.port}`);
  });

  // Fail fast if the database is unreachable or misconfigured
  await testConnection();
}

module.exports = { initializeDatabase };
