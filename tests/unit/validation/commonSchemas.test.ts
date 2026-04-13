/**
 * Common Schemas Unit Tests
 */

import {
  validateString,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  validateEmail,
  validateInteger,
  validateNumber,
  validateIntegerRange,
  validateBoolean,
  validateEnum,
  validateArray,
  validateRequiredProps,
  validateURL,
  validateUUID,
  validateAlphanumeric,
} from '../../../server/src/validation/schemas/commonSchemas';

describe('Common Validation Schemas', () => {
  describe('validateString()', () => {
    it('should validate non-empty string', () => {
      const result = validateString('test');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('test');
    });

    it('should trim whitespace', () => {
      const result = validateString('  test  ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('test');
    });

    it('should fail for empty string', () => {
      const result = validateString('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should fail for non-string', () => {
      const result = validateString(123);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should fail for null/undefined', () => {
      expect(validateString(null).valid).toBe(false);
      expect(validateString(undefined).valid).toBe(false);
    });
  });

  describe('validateMinLength()', () => {
    it('should validate string with minimum length', () => {
      expect(validateMinLength('abc', 3).valid).toBe(true);
      expect(validateMinLength('abcd', 3).valid).toBe(true);
    });

    it('should fail for shorter string', () => {
      const result = validateMinLength('ab', 3, 'Field');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Field must be at least 3 characters');
    });

    it('should fail for non-string', () => {
      expect(validateMinLength(123, 3).valid).toBe(false);
    });
  });

  describe('validateMaxLength()', () => {
    it('should validate string with maximum length', () => {
      expect(validateMaxLength('abc', 3).valid).toBe(true);
      expect(validateMaxLength('ab', 3).valid).toBe(true);
    });

    it('should fail for longer string', () => {
      const result = validateMaxLength('abcd', 3, 'Field');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Field cannot exceed 3 characters');
    });
  });

  describe('validatePattern()', () => {
    it('should validate matching pattern', () => {
      expect(validatePattern('abc', /^[a-z]+$/).valid).toBe(true);
    });

    it('should fail for non-matching pattern', () => {
      expect(validatePattern('123', /^[a-z]+$/, 'Must be letters').valid).toBe(false);
    });
  });

  describe('validateEmail()', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
    });

    it('should fail for invalid email', () => {
      expect(validateEmail('invalid-email').valid).toBe(false);
      expect(validateEmail('test@').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail(null).valid).toBe(false);
    });
  });

  describe('validateInteger()', () => {
    it('should validate integer', () => {
      expect(validateInteger(123).valid).toBe(true);
      expect(validateInteger('123').valid).toBe(true);
    });

    it('should fail for non-integer', () => {
      expect(validateInteger('abc').valid).toBe(false);
      expect(validateInteger(null).valid).toBe(false);
    });
  });

  describe('validateNumber()', () => {
    it('should validate number', () => {
      expect(validateNumber(12.3).valid).toBe(true);
      expect(validateNumber('12.3').valid).toBe(true);
    });

    it('should fail for non-number', () => {
      expect(validateNumber('abc').valid).toBe(false);
    });
  });

  describe('validateIntegerRange()', () => {
    it('should validate integer within range', () => {
      expect(validateIntegerRange(5, 0, 10).valid).toBe(true);
      expect(validateIntegerRange('5', 0, 10).valid).toBe(true);
    });

    it('should fail for integer outside range', () => {
      expect(validateIntegerRange(-1, 0, 10).valid).toBe(false);
      expect(validateIntegerRange(11, 0, 10).valid).toBe(false);
    });

    it('should fail for non-integer', () => {
      expect(validateIntegerRange('abc', 0, 10).valid).toBe(false);
    });
  });

  describe('validateBoolean()', () => {
    it('should validate booleans', () => {
      expect(validateBoolean(true).value).toBe(true);
      expect(validateBoolean(false).value).toBe(false);
      expect(validateBoolean('true').value).toBe(true);
      expect(validateBoolean('false').value).toBe(false);
      expect(validateBoolean(1).value).toBe(true);
      expect(validateBoolean(0).value).toBe(false);
    });

    it('should fail for invalid boolean', () => {
      expect(validateBoolean('invalid').valid).toBe(false);
      expect(validateBoolean(null).valid).toBe(false);
    });
  });

  describe('validateEnum()', () => {
    it('should validate values in enum', () => {
      const allowed = ['A', 'B'];
      expect(validateEnum('A', allowed).valid).toBe(true);
      expect(validateEnum('C', allowed).valid).toBe(false);
    });

    it('should fail for null/undefined', () => {
      expect(validateEnum(null, ['A']).valid).toBe(false);
    });
  });

  describe('validateArray()', () => {
    it('should validate array items', () => {
      const validator = (item: unknown) => ({
        valid: typeof item === 'number',
        error: 'Not a number',
      });
      const result = validateArray<number>([1, 2, 3], validator);
      expect(result.valid).toBe(true);
      expect(result.value).toEqual([1, 2, 3]);
    });

    it('should fail for empty array', () => {
      expect(validateArray([], () => ({ valid: true })).valid).toBe(false);
    });

    it('should fail for non-array', () => {
      expect(validateArray('not-an-array', () => ({ valid: true })).valid).toBe(false);
    });

    it('should fail for too many items', () => {
      expect(validateArray([1, 2, 3], () => ({ valid: true }), 2).valid).toBe(false);
    });

    it('should collect errors from array items', () => {
      const validator = (item: unknown) => ({
        valid: typeof item === 'number',
        error: 'Not a number',
      });
      const result = validateArray<number>([1, 'a', 3], validator);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Item 1: Not a number');
    });
  });

  describe('validateRequiredProps()', () => {
    it('should validate object with required props', () => {
      const obj = { a: 1, b: 2 };
      expect(validateRequiredProps(obj, ['a', 'b']).valid).toBe(true);
    });

    it('should fail for missing props', () => {
      const obj = { a: 1 };
      const result = validateRequiredProps(obj, ['a', 'b']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required properties: b');
    });

    it('should fail for non-object', () => {
      expect(validateRequiredProps(null, ['a']).valid).toBe(false);
      expect(validateRequiredProps('not-an-object', ['a']).valid).toBe(false);
    });
  });

  describe('validateURL()', () => {
    it('should validate correct URL', () => {
      expect(validateURL('https://example.com').valid).toBe(true);
    });

    it('should fail for invalid URL', () => {
      expect(validateURL('not-a-url').valid).toBe(false);
    });
  });

  describe('validateUUID()', () => {
    it('should validate correct UUID', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000').valid).toBe(true);
    });

    it('should fail for invalid UUID', () => {
      expect(validateUUID('invalid-uuid').valid).toBe(false);
    });
  });

  describe('validateAlphanumeric()', () => {
    it('should validate alphanumeric string', () => {
      expect(validateAlphanumeric('abc123').valid).toBe(true);
    });

    it('should fail for non-alphanumeric string', () => {
      expect(validateAlphanumeric('abc_123').valid).toBe(false);
      expect(validateAlphanumeric('abc 123').valid).toBe(false);
    });
  });
});
