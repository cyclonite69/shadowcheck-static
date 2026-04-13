/**
 * Test data factories for ShadowCheck
 */

export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'test_user',
  email: 'test@example.com',
  role: 'user',
  is_active: true,
  password_hash: '$2b$12$L7R7z4G2e9H3i1j0K9L8m7n6O5p4Q3r2S1t0U9v8W7x6Y5z4A3b2C', // 'password123'
  force_password_change: false,
  ...overrides,
});

export const createMockNetwork = (overrides = {}) => ({
  bssid: 'AA:BB:CC:DD:EE:FF',
  ssid: 'ShadowCheck_Node_01',
  encryption: 'WPA3',
  threat_score: 15,
  radio_type: 'W',
  observation_count: 10,
  ...overrides,
});

export const createMockObservation = (overrides = {}) => ({
  id: 1,
  bssid: 'AA:BB:CC:DD:EE:FF',
  ssid: 'ShadowCheck_Node_01',
  signal: -65,
  lat: 40.7128,
  lon: -74.006,
  time: '2026-04-13T12:00:00Z',
  ...overrides,
});
