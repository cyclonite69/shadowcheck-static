const getAwsConfig = jest.fn();

jest.mock('../../server/src/config/container', () => ({
  awsService: { getAwsConfig },
}));

jest.mock('@aws-sdk/client-ec2', () => ({
  EC2Client: jest.fn(),
  DescribeInstancesCommand: jest.fn((input) => input),
}));

jest.mock('@aws-sdk/client-sts', () => ({
  STSClient: jest.fn(),
  GetCallerIdentityCommand: jest.fn((input) => input),
}));

const helpers = require('../../server/src/api/routes/v1/admin/adminAwsHelpers');

describe('admin AWS helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a regional client config and rejects missing regions', async () => {
    getAwsConfig.mockResolvedValueOnce({ region: 'us-east-1' });
    await expect(helpers.buildClientConfig()).resolves.toEqual({ region: 'us-east-1' });

    getAwsConfig.mockResolvedValueOnce({ region: '' });
    await expect(helpers.buildClientConfig()).rejects.toThrow('AWS region not configured');
  });

  it('paginates reservations and normalizes instance fields', async () => {
    const client = {
      send: jest
        .fn()
        .mockResolvedValueOnce({
          Reservations: [
            {
              Instances: [
                {
                  InstanceId: 'i-1',
                  Tags: [{ Key: 'Name', Value: 'api' }],
                  State: { Name: 'running' },
                  Placement: { AvailabilityZone: 'us-east-1a' },
                },
              ],
            },
          ],
          NextToken: 'next',
        })
        .mockResolvedValueOnce({
          Reservations: [{ Instances: [{ InstanceId: 'i-2' }] }],
        }),
    };

    await expect(helpers.listInstances(client)).resolves.toEqual([
      expect.objectContaining({ instanceId: 'i-1', name: 'api', state: 'running' }),
      expect.objectContaining({ instanceId: 'i-2', name: null, state: null }),
    ]);
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it('counts instance states including unknown values', () => {
    expect(
      helpers.buildStateCounts([{ state: 'running' }, { state: 'running' }, { state: null }])
    ).toEqual({ total: 3, states: { running: 2, unknown: 1 } });
  });

  it.each([
    [{ name: 'AccessDeniedException' }, true],
    [{ message: 'not authorized for ec2' }, true],
    [{ message: 'network timeout' }, false],
  ])('classifies access-denied errors', (error, expected) => {
    expect(helpers.isAccessDeniedError(error)).toBe(expected);
  });

  it.each([
    [{ name: 'ExpiredToken' }, true],
    [{ message: 'Unable to locate credentials' }, true],
    [{ message: 'network timeout' }, false],
  ])('classifies credential errors', (error, expected) => {
    expect(helpers.isCredentialError(error)).toBe(expected);
  });
});
