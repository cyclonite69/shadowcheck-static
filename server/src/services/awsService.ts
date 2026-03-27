export {};
const { query } = require('../config/database');

const AWS_REGION_SETTING_KEY = 'aws_region';

const getConfiguredAwsRegion = async (): Promise<string | null> => {
  const result = await query('SELECT value FROM app.settings WHERE key = $1 LIMIT 1', [
    AWS_REGION_SETTING_KEY,
  ]);
  const raw = result.rows[0]?.value;
  if (!raw) return null;
  return typeof raw === 'string' ? raw : String(raw);
};

const getAwsRegion = async (): Promise<string | null> => {
  return (
    (await getConfiguredAwsRegion()) ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    null
  );
};

const getAwsConfig = async () => {
  const region = await getAwsRegion();
  return {
    region,
    // Explicit credential injection is intentionally disabled.
    // AWS SDK/CLI must resolve credentials from the runtime provider chain
    // (instance profile, STS, SSO, etc.).
    credentials: undefined,
    hasExplicitCredentials: false,
  };
};

module.exports = {
  getAwsConfig,
  getAwsRegion,
};
