export {};

jest.mock('../../../server/src/services/wigleClient', () => ({
  fetchWigle: jest.fn(),
}));

jest.mock('../../../server/src/services/wigleAuditLogger', () => ({
  logWigleAuditEvent: jest.fn(),
}));

jest.mock('../../../server/src/logging/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

import { wigleGatewayFetch } from '../../../server/src/services/wigle/wigleGateway';

const { fetchWigle } = require('../../../server/src/services/wigleClient');
const wigleRequestLedger = require('../../../server/src/services/wigleRequestLedger');

describe('wigleGateway — stats quota gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 429 before fetchWigle when stats soft limit is hit', async () => {
    jest.spyOn(wigleRequestLedger, 'assertCanRequest').mockImplementation((kind: unknown) => {
      if (kind === 'stats') {
        const e: any = new Error('WiGLE stats soft limit reached (10/10).');
        e.status = 429;
        throw e;
      }
    });

    const result = await wigleGatewayFetch({
      kind: 'stats',
      url: 'https://api.wigle.net/api/v2/profile/user',
      entrypoint: 'stats-test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.error).toContain('soft limit');
    }
    expect(fetchWigle).not.toHaveBeenCalled();
  });

  it('calls fetchWigle for stats after assertCanRequest passes', async () => {
    jest.spyOn(wigleRequestLedger, 'updateLedgerOutcome').mockImplementation(() => {});
    const mockResponse = {
      ok: true,
      status: 200,
      clone: () => mockResponse,
    };
    (fetchWigle as jest.Mock).mockResolvedValue({ response: mockResponse, ledgerId: 1 });

    const result = await wigleGatewayFetch({
      kind: 'stats',
      url: 'https://api.wigle.net/api/v2/profile/user',
      entrypoint: 'stats-test',
    });

    expect(result.ok).toBe(true);
    expect(fetchWigle).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'stats', url: 'https://api.wigle.net/api/v2/profile/user' })
    );
  });
});
