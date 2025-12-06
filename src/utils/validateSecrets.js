const secretsManager = require('../services/secretsManager');

async function validateSecrets() {
  try {
    await secretsManager.load();
    return true;
  } catch (error) {
    console.error('\n❌ SECRETS VALIDATION FAILED\n');
    console.error(error.message);
    console.error('\nServer cannot start without required secrets.\n');
    process.exit(1);
  }
}

module.exports = { validateSecrets };
