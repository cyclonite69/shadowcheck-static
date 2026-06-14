import express from 'express';
import request from 'supertest';

const mockTagsService = {
  getOUIGroups: jest.fn(),
  getOUIGroupDetails: jest.fn(),
  getMACRandomizationSuspects: jest.fn(),
};
const mockGroupingService = {
  generateOUIGroups: jest.fn(),
  detectMACRandomization: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  adminNetworkTagsService: mockTagsService,
  ouiGroupingService: mockGroupingService,
}));

jest.mock('../../server/src/views/ouiGroupingDemo', () => ({
  ouiGroupingDemoHtml: '<html>demo</html>',
}));

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v1/admin/oui').default);

describe('admin OUI routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists OUI groups with a count', async () => {
    mockTagsService.getOUIGroups.mockResolvedValue([{ oui: 'AABBCC' }]);

    const response = await request(app).get('/api/admin/oui/groups');

    expect(response.body).toEqual({ ok: true, groups: [{ oui: 'AABBCC' }], count: 1 });
  });

  it('reports OUI group list failures', async () => {
    mockTagsService.getOUIGroups.mockRejectedValue(new Error('failed'));

    const response = await request(app).get('/api/admin/oui/groups');

    expect(response.status).toBe(500);
  });

  it('returns OUI details', async () => {
    mockTagsService.getOUIGroupDetails.mockResolvedValue({
      group: { oui: 'AABBCC' },
      randomization: { likely: true },
      networks: [{ bssid: 'AA:BB:CC:00:00:01' }],
    });

    const response = await request(app).get('/api/admin/oui/AABBCC/details');

    expect(response.body.ok).toBe(true);
    expect(mockTagsService.getOUIGroupDetails).toHaveBeenCalledWith('AABBCC');
  });

  it('reports OUI detail failures', async () => {
    mockTagsService.getOUIGroupDetails.mockRejectedValue(new Error('failed'));

    const response = await request(app).get('/api/admin/oui/AABBCC/details');

    expect(response.status).toBe(500);
  });

  it('lists randomization suspects', async () => {
    mockTagsService.getMACRandomizationSuspects.mockResolvedValue([{ bssid: 'randomized' }]);

    const response = await request(app).get('/api/admin/oui/randomization/suspects');

    expect(response.body.count).toBe(1);
  });

  it('reports suspect list failures', async () => {
    mockTagsService.getMACRandomizationSuspects.mockRejectedValue(new Error('failed'));

    const response = await request(app).get('/api/admin/oui/randomization/suspects');

    expect(response.status).toBe(500);
  });

  it('runs both OUI analysis phases', async () => {
    mockGroupingService.generateOUIGroups.mockResolvedValue(undefined);
    mockGroupingService.detectMACRandomization.mockResolvedValue(undefined);

    const response = await request(app).post('/api/admin/oui/analyze');

    expect(response.body.ok).toBe(true);
    expect(mockGroupingService.generateOUIGroups).toHaveBeenCalled();
    expect(mockGroupingService.detectMACRandomization).toHaveBeenCalled();
  });

  it('stops and reports failed OUI analysis', async () => {
    mockGroupingService.generateOUIGroups.mockRejectedValue(new Error('failed'));

    const response = await request(app).post('/api/admin/oui/analyze');

    expect(response.status).toBe(500);
    expect(mockGroupingService.detectMACRandomization).not.toHaveBeenCalled();
  });

  it('serves the grouping demo', async () => {
    const response = await request(app).get('/api/admin/demo/oui-grouping');

    expect(response.status).toBe(200);
    expect(response.text).toBe('<html>demo</html>');
  });
});
