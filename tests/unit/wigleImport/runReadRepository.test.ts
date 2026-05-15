const { query } = require('../../../server/src/config/database');

import * as runReadRepository from '../../../server/src/services/wigleImport/repositories/runReadRepository';

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('runReadRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findLatestResumableRun queries by normalized fingerprint and statuses', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 42, status: 'paused' }] });

    const result = await runReadRepository.findLatestResumableRun({ ssid: 'test', country: 'US' }, [
      'paused',
      'failed',
    ]);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE request_fingerprint = $1'), [
      expect.any(String),
      ['paused', 'failed'],
    ]);
    expect(result).toEqual({ id: 42, status: 'paused' });
  });

  it('getRunPages returns ordered page rows', async () => {
    query.mockResolvedValueOnce({ rows: [{ page_number: 3 }, { page_number: 2 }] });

    const result = await runReadRepository.getRunPages(9, 2);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM app.wigle_import_run_pages'),
      [9, 2]
    );
    expect(result).toEqual([{ page_number: 3 }, { page_number: 2 }]);
  });
});
