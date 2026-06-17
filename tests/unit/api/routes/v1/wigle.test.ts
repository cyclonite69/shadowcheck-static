import request from 'supertest';
import express from 'express';

// Mock container
const mockImportWigleDirectory = jest.fn();
jest.mock('../../../../../server/src/config/container', () => ({
  wigleImportService: {
    importWigleDirectory: mockImportWigleDirectory,
  },
}));

// Mock logger
jest.mock('../../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

import wigleRouter from '../../../../../server/src/api/routes/v1/wigle';

const app = express();
app.use(express.json());
app.use('/', wigleRouter);

describe('WiGLE Import Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /import/wigle', () => {
    it('returns success on successful import', async () => {
      mockImportWigleDirectory.mockResolvedValue({
        filesProcessed: 2,
        recordsInserted: 10,
      });

      const response = await request(app).post('/import/wigle');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        filesProcessed: 2,
        recordsInserted: 10,
      });
      // It should have called importWigleDirectory with a path ending in 'imports/wigle'
      expect(mockImportWigleDirectory).toHaveBeenCalledWith(
        expect.stringContaining('imports/wigle')
      );
    });

    it('returns 500 on import failure', async () => {
      mockImportWigleDirectory.mockRejectedValue(new Error('Import failed'));

      const response = await request(app).post('/import/wigle');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Import failed',
      });
    });

    it('handles non-Error objects gracefully', async () => {
      mockImportWigleDirectory.mockRejectedValue('String error');

      const response = await request(app).post('/import/wigle');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'String error',
      });
    });
  });
});
