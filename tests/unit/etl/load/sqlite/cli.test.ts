import {
  buildIncrementalImportUsage,
  parseIncrementalImportCliArgs,
} from '../../../../../etl/load/sqlite/cli';

describe('etl/load/sqlite/cli', () => {
  it('validates sqlite CLI args, file existence, and empty derived source tags', () => {
    expect(buildIncrementalImportUsage('sqlite-import.ts')).toContain(
      'npx tsx sqlite-import.ts <sqlite_file> [source_tag]'
    );
    expect(
      parseIncrementalImportCliArgs(['/tmp/exists.sqlite'], {
        existsSync: () => true,
        env: {},
      })
    ).toEqual({
      ok: true,
      request: { sqliteFile: '/tmp/exists.sqlite', sourceTag: 'exists' },
    });
    expect(
      parseIncrementalImportCliArgs(['/tmp/!!!.sqlite'], {
        existsSync: () => true,
        env: { IMPORT_SOURCE_TAG: '!!!' },
      })
    ).toMatchObject({
      ok: false,
      stream: 'stderr',
      message: expect.stringContaining('source_tag could not be derived'),
    });
  });
});
