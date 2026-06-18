export {};

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/logging/logger');

import { getSafeLimitSync, resetLimitsCache } from '../../../server/src/services/wigleLimits';
import { adminQuery } from '../../../server/src/services/adminDbService';

describe('wigleLimits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLimitsCache();
  });

  test('returns fallback when cache is empty', () => {
    expect(getSafeLimitSync('search')).toBe(50);
    expect(getSafeLimitSync('stats')).toBe(49);
    expect(getSafeLimitSync('detail')).toBe(200);
  });

  test('never hits the DB — purely reads cache', () => {
    getSafeLimitSync('search');
    getSafeLimitSync('stats');
    expect(adminQuery).not.toHaveBeenCalled();
  });
});
