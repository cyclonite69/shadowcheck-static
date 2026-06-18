export {};

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/logging/logger');

import { getOptimalQueryWindow } from '../../../server/src/services/wigleScheduler';
import { adminQuery } from '../../../server/src/services/adminDbService';

describe('wigleScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns insufficient_data when profile has no rows', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await getOptimalQueryWindow('search');
    expect(result.resetType).toBe('insufficient_data');
    expect(result.recommendedStartUtcHour).toBeNull();
  });

  test('returns insufficient_data from DB profile', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({
      rows: [{ reset_type: 'insufficient_data', likely_reset_utc_hour: null, confidence: 'low' }],
    });

    const result = await getOptimalQueryWindow('search');
    expect(result.resetType).toBe('insufficient_data');
    expect(result.resetHour).toBeNull();
  });

  test('fixed_clock profile returns recommendedStartUtcHour', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({
      rows: [{ reset_type: 'fixed_clock', likely_reset_utc_hour: 0, confidence: 'high' }],
    });

    const result = await getOptimalQueryWindow('search');
    expect(result.resetType).toBe('fixed_clock');
    expect(result.recommendedStartUtcHour).toBe(0);
    expect(result.confidence).toBe('high');
  });

  test('rolling_window profile returns null recommendedStartUtcHour', async () => {
    (adminQuery as jest.Mock).mockResolvedValue({
      rows: [{ reset_type: 'rolling_window', likely_reset_utc_hour: 14, confidence: 'medium' }],
    });

    const result = await getOptimalQueryWindow('search');
    expect(result.resetType).toBe('rolling_window');
    expect(result.recommendedStartUtcHour).toBeNull();
    expect(result.resetHour).toBe(14);
  });

  test('returns insufficient_data on DB error without throwing', async () => {
    (adminQuery as jest.Mock).mockRejectedValue(new Error('DB Down'));

    const result = await getOptimalQueryWindow('stats');
    expect(result.resetType).toBe('insufficient_data');
  });
});
