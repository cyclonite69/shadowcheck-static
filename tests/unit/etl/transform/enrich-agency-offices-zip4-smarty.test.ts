import {
  parseArgs,
  handleRunError,
} from '../../../../etl/transform/enrich-agency-offices-zip4-smarty';

describe('enrich-agency-offices-zip4-smarty parseArgs', () => {
  test('returns default options', () => {
    const opts = parseArgs([]);
    expect(opts).toEqual({
      limit: 500,
      batchSize: 50,
      sleepMs: 250,
      dryRun: true,
      withCoordinates: false,
      testAuthOnly: false,
      states: null,
    });
  });

  test('parses custom arguments correctly', () => {
    const opts = parseArgs([
      '--limit=100',
      '--batch-size=10',
      '--sleep-ms=500',
      '--live=true',
      '--with-coordinates',
      '--test-auth',
      '--states=CA,NY',
    ]);
    expect(opts).toEqual({
      limit: 100,
      batchSize: 10,
      sleepMs: 500,
      dryRun: false,
      withCoordinates: true,
      testAuthOnly: true,
      states: ['CA', 'NY'],
    });
  });

  test('handles individual state argument', () => {
    const opts = parseArgs(['--live', '--state=tx']);
    expect(opts.dryRun).toBe(false);
    expect(opts.states).toEqual(['TX']);
  });

  test('handles invalid numeric arguments by falling back', () => {
    const opts = parseArgs(['--limit=-10', '--batch-size=abc', '--sleep-ms=0']);
    expect(opts.limit).toBe(500);
    expect(opts.batchSize).toBe(50);
    expect(opts.sleepMs).toBe(250);
  });

  test('handleRunError logs error and exits process', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => ({}) as never);

    const err = new Error('Test error');
    handleRunError(err);

    expect(consoleSpy).toHaveBeenCalledWith(err);
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
