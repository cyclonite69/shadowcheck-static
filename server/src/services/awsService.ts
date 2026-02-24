export {};
const secretsManager = require('./secretsManager').default;

const getAwsRegion = async (): Promise<string | null> => {
  return (
    secretsManager.get('aws_region') ||
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
};
