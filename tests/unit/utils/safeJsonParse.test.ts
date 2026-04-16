import { safeJsonParse } from '../../../server/src/utils/safeJsonParse';

describe('safeJsonParse', () => {
  it('should return null for non-string input', () => {
    expect(safeJsonParse(null)).toBeNull();
    expect(safeJsonParse(undefined)).toBeNull();
  });

  it('should parse valid JSON objects', () => {
    expect(safeJsonParse('{"a": 1}')).toEqual({ a: 1 });
  });

  it('should parse valid JSON arrays', () => {
    expect(safeJsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('should handle strings that do not start with [ or {', () => {
    expect(safeJsonParse('   true   ')).toBeNull();
    expect(safeJsonParse('123')).toBeNull();
  });
});
