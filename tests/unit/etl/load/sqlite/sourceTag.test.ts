import {
  deriveSourceTag,
  resolveSourceTag,
  sanitizeSourceTag,
} from '../../../../../etl/load/sqlite/sourceTag';

describe('etl/load/sqlite/sourceTag', () => {
  it('sanitizes, truncates, and falls back through explicit/env/file tag sources', () => {
    expect(sanitizeSourceTag('  Device @@@ Unit ---  ')).toBe('device_unit_---');
    expect(sanitizeSourceTag('x'.repeat(80))).toHaveLength(50);
    expect(deriveSourceTag('/tmp/!!!.sqlite')).toBe('wigle_import');
    expect(resolveSourceTag('/tmp/file.sqlite', undefined, { SOURCE_TAG: 'Env Tag' })).toBe(
      'env_tag'
    );
  });
});
