import {
  buildIncrementalImportUsage,
  parseIncrementalImportCliArgs,
} from '../../etl/load/sqlite/cli';

describe('sqlite import cli helpers', () => {
  it('returns usage output when no args are provided', () => {
    const result = parseIncrementalImportCliArgs([], { scriptName: 'sqlite-import.ts' });

    expect(result).toEqual({
      ok: false,
      exitCode: 1,
      message: buildIncrementalImportUsage('sqlite-import.ts'),
      stream: 'stdout',
    });
  });

  it('returns stderr error when sqlite file does not exist', () => {
    const result = parseIncrementalImportCliArgs(['/tmp/missing.sqlite'], {
      existsSync: () => false,
    });

    expect(result).toEqual({
      ok: false,
      exitCode: 1,
      message: '❌ File not found: /tmp/missing.sqlite',
      stream: 'stderr',
    });
  });

  it('returns parsed request when args are valid', () => {
    const result = parseIncrementalImportCliArgs(['/tmp/Backup Copy.sqlite', 'Provided Tag'], {
      existsSync: () => true,
    });

    expect(result).toEqual({
      ok: true,
      request: {
        sqliteFile: '/tmp/Backup Copy.sqlite',
        sourceTag: 'provided_tag',
      },
    });
  });
});
