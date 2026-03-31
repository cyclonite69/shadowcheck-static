import secretsManager from '../services/secretsManager';
import logger from '../logging/logger';

/**
 * Loads and validates required secrets for application startup.
 * Exits the process if required secrets are missing.
 */
async function validateSecrets(): Promise<boolean> {
  try {
    await secretsManager.load();

    // Warn loudly if SM wasn't reachable — secrets may be incomplete
    if (!secretsManager.smReachable) {
      logger.warn('='.repeat(70));
      logger.warn('AWS SECRETS MANAGER IS UNREACHABLE');
      if (secretsManager.smLastError) {
        logger.warn(`  Error: ${secretsManager.smLastError}`);
      }
      if (secretsManager.smLastError?.includes('Token is expired') ||
          secretsManager.smLastError?.includes('CredentialsProviderError')) {
        logger.warn("  Fix: Run 'aws sso login --profile shadowcheck-sso' on the host, then restart the container");
      }
      logger.warn('  Non-credential secrets (mapbox_token, etc.) will be unavailable until SM is reachable.');
      logger.warn('  The app will retry SM periodically and self-heal when credentials are refreshed.');
      logger.warn('='.repeat(70));
    }

    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('SECRETS VALIDATION FAILED');
    logger.error(err.message);
    logger.error('Server cannot start without required secrets.');
    process.exit(1);
  }
}

export { validateSecrets };
