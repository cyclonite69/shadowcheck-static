/**
 * Regression test for networks API data integrity
 * Ensures null values are preserved and not converted to 0
 */

const request = require('supertest');
const app = require('../../server/server');

describe('Networks API Data Integrity', () => {
  test('should preserve null values and not return fake zeros', async () => {
    const response = await request(app)
      .get('/api/networks?limit=5&offset=0&location_mode=latest_observation')
      .expect(200);

    expect(response.body).toHaveProperty('networks');
    expect(Array.isArray(response.body.networks)).toBe(true);

    if (response.body.networks.length > 0) {
      const network = response.body.networks[0];

      // Signal should be null or a valid negative dBm value, never 0
      if (network.signal !== null) {
        expect(typeof network.signal).toBe('number');
        expect(network.signal).toBeLessThan(0); // dBm values are always negative
        expect(network.signal).not.toBe(0); // 0 dBm is not realistic
      }

      // Frequency should be null or a valid frequency, never 0
      if (network.frequency !== null) {
        expect(typeof network.frequency).toBe('number');
        expect(network.frequency).toBeGreaterThan(0);
        expect(network.frequency).not.toBe(0);
      }

      // Channel should be null or a valid channel number, never 0 for WiFi
      if (network.channel !== null && network.type === 'W') {
        expect(typeof network.channel).toBe('number');
        expect(network.channel).toBeGreaterThan(0);
        expect(network.channel).not.toBe(0);
      }

      // Distance should not be the hardcoded fallback value
      if (network.distance_from_home_km !== null) {
        expect(network.distance_from_home_km).not.toBe(9497.62809709848);
      }
    }
  });

  test('should calculate distance per-row, not use constant fallback', async () => {
    const response = await request(app)
      .get('/api/networks?limit=10&offset=0&location_mode=latest_observation')
      .expect(200);

    const networks = response.body.networks || [];
    const distances = networks.map((n) => n.distance_from_home_km).filter((d) => d !== null);

    if (distances.length > 1) {
      // Should have varying distances, not all the same constant
      const uniqueDistances = new Set(distances);
      expect(uniqueDistances.size).toBeGreaterThan(1);

      // Should not contain the hardcoded fallback
      expect(distances).not.toContain(9497.62809709848);
    }
  });
});
