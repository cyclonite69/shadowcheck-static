import express from 'express';
import request from 'supertest';

const networkTagService = {
  getNetworkTagByBssid: jest.fn(),
  listNetworkTags: jest.fn(),
};
const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  networkService: {},
  networkTagService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const listTagsRouter = require('../../server/src/api/routes/v1/network-tags/listTags');

const app = express();
app.use(express.json());
app.use('/api/network-tags', listTagsRouter);

describe('network tag list routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defaults when a normalized BSSID has no tag', async () => {
    networkTagService.getNetworkTagByBssid.mockResolvedValueOnce(null);

    const response = await request(app).get('/api/network-tags/aa:bb:cc:dd:ee:ff');

    expect(response.status).toBe(200);
    expect(networkTagService.getNetworkTagByBssid).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    expect(response.body).toEqual({
      bssid: 'AA:BB:CC:DD:EE:FF',
      is_ignored: false,
      ignore_reason: null,
      threat_tag: null,
      threat_confidence: null,
      notes: null,
      exists: false,
    });
  });

  it('returns an existing network tag', async () => {
    networkTagService.getNetworkTagByBssid.mockResolvedValueOnce({
      bssid: 'AA:BB:CC:DD:EE:FF',
      threat_tag: 'THREAT',
    });

    const response = await request(app).get('/api/network-tags/AA:BB:CC:DD:EE:FF');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      bssid: 'AA:BB:CC:DD:EE:FF',
      threat_tag: 'THREAT',
      exists: true,
    });
  });

  it('rejects invalid BSSID path parameters', async () => {
    const response = await request(app).get('/api/network-tags/not!a!network');

    expect(response.status).toBe(400);
    expect(networkTagService.getNetworkTagByBssid).not.toHaveBeenCalled();
  });

  it('handles a tag lookup failure', async () => {
    networkTagService.getNetworkTagByBssid.mockRejectedValueOnce(new Error('lookup failed'));

    const response = await request(app).get('/api/network-tags/AA:BB:CC:DD:EE:FF');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'lookup failed' });
  });

  it('lists tags with defaults and removes the count helper column', async () => {
    networkTagService.listNetworkTags.mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC:DD:EE:FF', total_count: '1' }],
      totalCount: 1,
    });

    const response = await request(app).get('/api/network-tags');

    expect(response.status).toBe(200);
    expect(networkTagService.listNetworkTags).toHaveBeenCalledWith([], [], 100, 0);
    expect(response.body).toEqual({
      tags: [{ bssid: 'AA:BB:CC:DD:EE:FF' }],
      total: 1,
      limit: 100,
      offset: 0,
    });
  });

  it('passes validated filters and pagination to the service', async () => {
    networkTagService.listNetworkTags.mockResolvedValueOnce({
      rows: [],
      totalCount: 0,
    });

    const response = await request(app).get('/api/network-tags').query({
      ignored: 'false',
      threat_tag: 'SUSPECT',
      has_notes: 'true',
      pending_wigle: 'true',
      limit: '25',
      offset: '50',
    });

    expect(response.status).toBe(200);
    expect(networkTagService.listNetworkTags).toHaveBeenCalledWith(
      [
        'nt.is_ignored = false',
        'nt.threat_tag = $1',
        'nt.notes IS NOT NULL',
        'nt.wigle_lookup_requested = true AND nt.wigle_result IS NULL',
      ],
      ['SUSPECT'],
      25,
      50
    );
  });

  it('builds the ignored=true filter independently', async () => {
    networkTagService.listNetworkTags.mockResolvedValueOnce({
      rows: [],
      totalCount: 0,
    });

    const response = await request(app).get('/api/network-tags?ignored=true');

    expect(response.status).toBe(200);
    expect(networkTagService.listNetworkTags).toHaveBeenCalledWith(
      ['nt.is_ignored = true'],
      [],
      100,
      0
    );
  });

  it('rejects invalid list query parameters', async () => {
    const response = await request(app).get('/api/network-tags?limit=5001');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(networkTagService.listNetworkTags).not.toHaveBeenCalled();
  });

  it('handles a tag listing failure', async () => {
    networkTagService.listNetworkTags.mockRejectedValueOnce(new Error('list failed'));

    const response = await request(app).get('/api/network-tags');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'list failed' });
  });
});
