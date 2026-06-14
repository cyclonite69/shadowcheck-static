import express from 'express';
import request from 'supertest';

const mockQuery = jest.fn();
const mockValidateBssid = jest.fn();
const mockRunSurveillanceScanJob = jest.fn();

jest.mock('../../server/src/config/database', () => ({
  query: mockQuery,
}));

jest.mock('../../server/src/validation/schemas', () => ({
  validateBSSID: mockValidateBssid,
}));

jest.mock('../../server/src/services/backgroundJobs/runners', () => ({
  runSurveillanceScanJob: mockRunSurveillanceScanJob,
}));

jest.mock('../../server/src/logging/logger', () => ({
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v1/admin/detectionEvidence'));

describe('detection evidence routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateBssid.mockReturnValue({ valid: true });
  });

  it('rejects invalid BSSIDs', async () => {
    mockValidateBssid.mockReturnValue({ valid: false, error: 'invalid BSSID' });

    const response = await request(app).get('/api/admin/networks/not-a-bssid/detection-evidence');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid BSSID');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns normalized evidence rows', async () => {
    mockQuery.mockResolvedValue({ rows: [{ device_type: 'camera' }] });

    const response = await request(app).get(
      '/api/admin/networks/aa:bb:cc:dd:ee:ff/detection-evidence'
    );

    expect(response.body).toEqual({
      ok: true,
      bssid: 'AA:BB:CC:DD:EE:FF',
      evidence: [{ device_type: 'camera' }],
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY'), [
      'AA:BB:CC:DD:EE:FF',
    ]);
  });

  it('reports evidence query failures', async () => {
    mockQuery.mockRejectedValue(new Error('query failed'));

    const response = await request(app).get(
      '/api/admin/networks/aa:bb:cc:dd:ee:ff/detection-evidence'
    );

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('query failed');
  });

  it('runs a surveillance dry-run with the requested sample limit', async () => {
    mockRunSurveillanceScanJob.mockResolvedValue({ success: true, candidates: 2 });

    const response = await request(app)
      .post('/api/admin/surveillance-detections/dry-run')
      .send({ sampleLimit: '25' });

    expect(response.body).toEqual({ success: true, candidates: 2 });
    expect(mockRunSurveillanceScanJob).toHaveBeenCalledWith({
      dryRun: true,
      sampleLimit: 25,
    });
  });

  it('defaults invalid dry-run limits to 100', async () => {
    mockRunSurveillanceScanJob.mockResolvedValue({ success: true });

    await request(app)
      .post('/api/admin/surveillance-detections/dry-run')
      .send({ sampleLimit: 'invalid' });

    expect(mockRunSurveillanceScanJob).toHaveBeenCalledWith({
      dryRun: true,
      sampleLimit: 100,
    });
  });

  it('reports dry-run failures', async () => {
    mockRunSurveillanceScanJob.mockRejectedValue(new Error('scan failed'));

    const response = await request(app).post('/api/admin/surveillance-detections/dry-run');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: 'scan failed' });
  });
});
