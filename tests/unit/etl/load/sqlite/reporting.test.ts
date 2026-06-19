import {
  buildImportSummary,
  logImportBanner,
  logNoNewRecords,
  writeImportProgress,
  logProgressComplete,
  printImportSummary,
  type ImportReportState,
} from '../../../../../etl/load/sqlite/reporting';

describe('sqlite/reporting', () => {
  let logSpy: jest.SpyInstance;
  let writeSpy: jest.SpyInstance;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10000);
  });

  afterEach(() => {
    logSpy.mockRestore();
    writeSpy.mockRestore();
    nowSpy.mockRestore();
  });

  describe('buildImportSummary', () => {
    it('computes correct duration and speed for positive imports', () => {
      const state: ImportReportState = {
        imported: 100,
        failed: 5,
        errors: ['err1'],
        startTime: 5000, // 5 seconds ago (10000 - 5000)
      };

      const result = buildImportSummary(state);
      expect(result).toEqual({
        imported: 100,
        failed: 5,
        durationS: 5,
        speed: 20, // 100 / 5
        errors: ['err1'],
      });
    });

    it('returns speed 0 if imported is 0', () => {
      const state: ImportReportState = {
        imported: 0,
        failed: 0,
        errors: [],
        startTime: 5000,
      };

      const result = buildImportSummary(state);
      expect(result.speed).toBe(0);
    });
  });

  describe('logImportBanner', () => {
    it('logs correct banner information', () => {
      logImportBanner('file.db', 'tag1', 100, true);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('INCREMENTAL IMPORT'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('file.db'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('tag1'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('100'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Debug: ON'));
    });

    it('logs correct banner when debug is false', () => {
      logImportBanner('file.db', 'tag1', 100, false);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Debug: OFF'));
    });
  });

  describe('logNoNewRecords', () => {
    it('logs database up to date message', () => {
      logNoNewRecords();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Database is up to date'));
    });
  });

  describe('writeImportProgress', () => {
    it('writes formatted progress and speed to process.stdout', () => {
      nowSpy.mockReturnValue(15000); // 5 seconds elapsed from 10000
      writeImportProgress(100, 200, 10000, 50); // 100 imported, 200 total, 50 processed

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('Progress: 100/200 (25%) | 20 rec/s')
      );
    });

    it('handles speed calculation when elapsed is 0', () => {
      nowSpy.mockReturnValue(10000); // 0 elapsed
      writeImportProgress(100, 200, 10000, 50);

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('Progress: 100/200 (25%) | 0 rec/s')
      );
    });
  });

  describe('logProgressComplete', () => {
    it('logs empty line to console', () => {
      logProgressComplete();
      expect(logSpy).toHaveBeenCalledWith('');
    });
  });

  describe('printImportSummary', () => {
    it('prints overall summary details without errors', () => {
      printImportSummary({
        imported: 50,
        failed: 0,
        durationS: 10,
        speed: 5,
        errors: [],
      });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('IMPORT COMPLETE'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Imported: 50'));
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Sample errors'));
    });

    it('prints summary details with sample errors (truncated to 5)', () => {
      printImportSummary({
        imported: 50,
        failed: 10,
        durationS: 10,
        speed: 5,
        errors: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
      });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Sample errors (first 5):'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('1. e1'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('5. e5'));
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('6. e6'));
    });
  });
});
