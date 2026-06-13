import express from 'express';
import request from 'supertest';

const threatReportService = {
  getThreatReportData: jest.fn(),
  renderMarkdown: jest.fn(),
  renderHtml: jest.fn(),
  renderPdfBuffer: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  threatReportService,
}));

const threatReportRouter = require('../../server/src/api/routes/v1/threat-report').default;

const app = express();
app.use(express.json());
app.use('/api', threatReportRouter);

describe('Threat Report Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid BSSID format', async () => {
    const res = await request(app).get('/api/reports/threat/invalid@mac');
    console.log('DEBUG RES FOR @:', res.status, res.body);
    expect(res.status).toBe(400);
  });

  it('returns 404 if network threat report data is not found', async () => {
    threatReportService.getThreatReportData.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/reports/threat/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(404);
    expect(threatReportService.getThreatReportData).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
  });

  it('returns JSON threat report by default', async () => {
    const reportData = { bssid: 'AA:BB:CC:DD:EE:FF', threat_score: 80 };
    threatReportService.getThreatReportData.mockResolvedValueOnce(reportData);

    const res = await request(app).get('/api/reports/threat/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.report).toEqual(reportData);
    expect(res.body.format).toBe('json');
  });

  it('returns markdown when format is md', async () => {
    const reportData = { bssid: 'AA:BB:CC:DD:EE:FF' };
    threatReportService.getThreatReportData.mockResolvedValueOnce(reportData);
    threatReportService.renderMarkdown.mockReturnValueOnce('# Threat Report');

    const res = await request(app)
      .get('/api/reports/threat/AA:BB:CC:DD:EE:FF')
      .query({ format: 'md' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.headers['content-disposition']).toContain('threat_report_AA_BB_CC_DD_EE_FF.md');
    expect(res.text).toBe('# Threat Report');
  });

  it('returns html when format is html', async () => {
    const reportData = { bssid: 'AA:BB:CC:DD:EE:FF' };
    threatReportService.getThreatReportData.mockResolvedValueOnce(reportData);
    threatReportService.renderHtml.mockReturnValueOnce('<h1>Report</h1>');

    const res = await request(app)
      .get('/api/reports/threat/AA:BB:CC:DD:EE:FF')
      .query({ format: 'html' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toBe('<h1>Report</h1>');
  });

  it('returns pdf buffer when format is pdf', async () => {
    const reportData = { bssid: 'AA:BB:CC:DD:EE:FF' };
    threatReportService.getThreatReportData.mockResolvedValueOnce(reportData);
    const pdfBuffer = Buffer.from('pdf content');
    threatReportService.renderPdfBuffer.mockResolvedValueOnce(pdfBuffer);

    const res = await request(app)
      .get('/api/reports/threat/AA:BB:CC:DD:EE:FF')
      .query({ format: 'pdf' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.toString()).toBe('pdf content');
  });

  it('returns 503 if pdfkit dependency is not installed', async () => {
    const reportData = { bssid: 'AA:BB:CC:DD:EE:FF' };
    threatReportService.getThreatReportData.mockResolvedValueOnce(reportData);
    const error: any = new Error('PDFKIT_NOT_INSTALLED');
    error.code = 'PDFKIT_NOT_INSTALLED';
    threatReportService.renderPdfBuffer.mockRejectedValueOnce(error);

    const res = await request(app)
      .get('/api/reports/threat/AA:BB:CC:DD:EE:FF')
      .query({ format: 'pdf' });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('PDF generation dependency is not installed');
  });

  it('returns 500 on other service errors', async () => {
    threatReportService.getThreatReportData.mockRejectedValueOnce(new Error('general error'));

    const res = await request(app).get('/api/reports/threat/AA:BB:CC:DD:EE:FF');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('general error');
  });
});
