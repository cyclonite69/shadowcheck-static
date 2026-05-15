import {
  deriveSourceTag,
  resolveSourceTag,
  sanitizeSourceTag,
} from '../../etl/load/sqlite/sourceTag';

describe('sqlite source tag helpers', () => {
  it('sanitizes arbitrary source tag input', () => {
    expect(sanitizeSourceTag('  My Device !!  ')).toBe('my_device');
  });

  it('derives a fallback source tag from the sqlite filename', () => {
    expect(deriveSourceTag('/tmp/My Backup.sqlite')).toBe('my_backup');
  });

  it('prefers explicit source tag, then env vars, then filename fallback', () => {
    expect(
      resolveSourceTag('/tmp/backup.sqlite', 'Provided Tag', {
        IMPORT_SOURCE_TAG: 'ignored-import-tag',
        SOURCE_TAG: 'ignored-source-tag',
      })
    ).toBe('provided_tag');

    expect(
      resolveSourceTag('/tmp/backup.sqlite', undefined, {
        IMPORT_SOURCE_TAG: 'Import Tag',
        SOURCE_TAG: 'fallback-tag',
      })
    ).toBe('import_tag');

    expect(resolveSourceTag('/tmp/Backup Copy.sqlite', undefined, {})).toBe('backup_copy');
  });
});
