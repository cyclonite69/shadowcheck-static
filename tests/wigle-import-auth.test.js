/**
 * Test WiGLE import admin protection
 */

const request = require('supertest');
const app = require('../../server/server');

describe('WiGLE Import Admin Protection', () => {
  test('should require admin access for WiGLE import', async () => {
    const response = await request(app).post('/api/import/wigle').expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should return proper error message for unauthorized access', async () => {
    const response = await request(app).post('/api/import/wigle');

    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.body.error).toBeDefined();
  });
});
