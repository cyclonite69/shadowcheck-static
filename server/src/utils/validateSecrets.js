const secretsManager = require('../services/secretsManager');
const logger = require('../logging/logger');

/**
 * Loads and validates required secrets for application startup.
 * Exits the process if required secrets are missing.
 * @returns {Promise<boolean>} Resolves true when secrets are valid
 */
async function validateSecrets() {
  try {
    await secretsManager.load();
    return true;
  } catch (error) {
    logger.error('SECRETS VALIDATION FAILED');
    logger.error(error.message);
    logger.error('Server cannot start without required secrets.');
    process.exit(1);
  }
}

module.exports = { validateSecrets };
