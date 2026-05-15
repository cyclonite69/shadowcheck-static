import {
  buildImportSummary,
  type ImportReportState,
  writeImportProgress,
} from '../../etl/load/sqlite/reporting';

describe('sqlite import reporting helpers', () => {
  it('builds summary stats from importer state', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(5_000);
    const state: ImportReportState = {
      imported: 200,
      failed: 3,
      errors: ['one'],
      startTime: 1_000,
    };

    expect(buildImportSummary(state)).toEqual({
      imported: 200,
      failed: 3,
      durationS: 4,
      speed: 50,
      errors: ['one'],
    });

    nowSpy.mockRestore();
  });

  it('writes progress output with formatted counts', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(5_000);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    writeImportProgress(150, 300, 1_000, 90);

    expect(writeSpy).toHaveBeenCalledWith('\r   Progress: 150/300 (30%) | 38 rec/s');

    writeSpy.mockRestore();
    nowSpy.mockRestore();
  });
});
