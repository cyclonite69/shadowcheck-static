export {};
const secretsManager = require('./secretsManager').default;

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

const getAwsRegion = async (): Promise<string | null> => {
  return (
    secretsManager.get('aws_region') ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    null
  );
};

const getAwsCredentials = async (): Promise<AwsCredentials | null> => {
  const accessKeyId = secretsManager.get('aws_access_key_id') || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    secretsManager.get('aws_secret_access_key') || process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = secretsManager.get('aws_session_token') || process.env.AWS_SESSION_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || undefined,
  };
};

const getAwsConfig = async () => {
  const region = await getAwsRegion();
  const credentials = await getAwsCredentials();
  return {
    region,
    credentials,
    hasExplicitCredentials: Boolean(credentials),
  };
};

module.exports = {
  getAwsConfig,
};
