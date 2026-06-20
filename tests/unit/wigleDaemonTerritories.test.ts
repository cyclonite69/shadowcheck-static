jest.mock('../../server/src/services/wigleImportRunService', () => ({
  getImportCompletenessReport: jest.fn(),
  resumeImportRun: jest.fn(),
  startImportRun: jest.fn(),
}));

jest.mock('../../server/src/logging/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { buildDaemonJurisdictionQueue } from '../../scripts/wigle-daemon';

describe('WiGLE daemon jurisdiction queue', () => {
  it('uses all 52 supported canonical jurisdictions when no runs exist', () => {
    const queue = buildDaemonJurisdictionQueue([]);

    expect(queue).toHaveLength(52);
    expect(queue.map((entry) => entry.state)).toEqual(expect.arrayContaining(['DC', 'PR']));
  });

  it('omits unverified territories even when old runs are resumable', () => {
    const queue = buildDaemonJurisdictionQueue(
      ['AS', 'GU', 'MP', 'VI'].map((state, index) => ({
        state,
        status: 'failed',
        resumable: true,
        runId: index + 1,
      }))
    );

    expect(queue.map((entry) => entry.state)).not.toEqual(
      expect.arrayContaining(['AS', 'GU', 'MP', 'VI'])
    );
  });

  it('keeps resumable supported runs and omits completed jurisdictions', () => {
    const queue = buildDaemonJurisdictionQueue([
      { state: 'AL', status: 'completed', resumable: false, runId: 1 },
      { state: 'ca', status: 'failed', resumable: true, runId: 2 },
    ]);

    expect(queue.find((entry) => entry.state === 'AL')).toBeUndefined();
    expect(queue.find((entry) => entry.state === 'CA')).toEqual(
      expect.objectContaining({ status: 'failed', resumable: true, runId: 2 })
    );
    expect(queue.find((entry) => entry.state === 'PR')).toEqual(
      expect.objectContaining({ status: null, resumable: false, runId: null })
    );
  });
});
