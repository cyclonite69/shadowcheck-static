const { getAwsConfig, getAwsRegion } = require('../../../server/src/services/awsService');
const { query } = require('../../../server/src/config/database');

jest.mock('../../../server/src/config/database');

describe('awsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear global fetch if necessary or mock it
    global.fetch = jest.fn();
  });

  describe('getAwsRegion', () => {
    it('should return configured region from database if present', async () => {
      query.mockResolvedValue({ rows: [{ value: 'us-west-2' }] });
      const region = await getAwsRegion();
      expect(region).toBe('us-west-2');
    });

    it('should return environment variable if no db config', async () => {
      query.mockResolvedValue({ rows: [] });
      process.env.AWS_REGION = 'us-east-1';
      const region = await getAwsRegion();
      expect(region).toBe('us-east-1');
      delete process.env.AWS_REGION;
    });

    it('should fallback to null if nothing is defined', async () => {
      query.mockResolvedValue({ rows: [] });
      const region = await getAwsRegion();
      expect(region).toBeNull();
    });
  });

  describe('getAwsConfig', () => {
    it('should return default config object', async () => {
      query.mockResolvedValue({ rows: [{ value: 'us-gov-west-1' }] });
      const config = await getAwsConfig();
      expect(config).toEqual({
        region: 'us-gov-west-1',
        credentials: undefined,
        hasExplicitCredentials: false,
      });
    });
  });
});
