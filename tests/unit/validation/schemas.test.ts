/**
 * Tests for Barrel export validation schemas
 */

import {
  validatePagination,
  validateTagType,
  validateConfidence,
  validateTimeRange,
  validateSort,
  validateSortOrder,
  validateSeverity,
  validateIntegerRange,
  validateNumberRange,
  combineValidations,
} from '../../../server/src/validation/schemas';

describe('Barrel Validation Schemas', () => {
  describe('validatePagination', () => {
    it('should validate correct pagination parameters', () => {
      const result = validatePagination('1', '20');
      expect(result.valid).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should fail on invalid page', () => {
      expect(validatePagination('0', '20').valid).toBe(false);
      expect(validatePagination('-1', '20').valid).toBe(false);
      expect(validatePagination('abc', '20').valid).toBe(false);
    });

    it('should fail on invalid limit', () => {
      expect(validatePagination('1', '0').valid).toBe(false);
      expect(validatePagination('1', '-1').valid).toBe(false);
      expect(validatePagination('1', 'abc').valid).toBe(false);
    });

    it('should fail if limit exceeds maxLimit', () => {
      const result = validatePagination('1', '100', 50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Limit cannot exceed 50');
    });
  });

  describe('validateTagType', () => {
    it('should validate correct tag types', () => {
      expect(validateTagType('LEGIT').valid).toBe(true);
      expect(validateTagType('false_positive').valid).toBe(true);
      expect(validateTagType('  INVESTIGATE  ').valid).toBe(true);
      expect(validateTagType('THREAT').valid).toBe(true);
    });

    it('should fail on invalid tag types', () => {
      expect(validateTagType('').valid).toBe(false);
      expect(validateTagType(null as any).valid).toBe(false);
      expect(validateTagType('INVALID').valid).toBe(false);
    });
  });

  describe('validateConfidence', () => {
    it('should validate correct confidence scores', () => {
      expect(validateConfidence(0).valid).toBe(true);
      expect(validateConfidence(100).valid).toBe(true);
      expect(validateConfidence('50').valid).toBe(true);
    });

    it('should fail on invalid confidence scores', () => {
      expect(validateConfidence(-1).valid).toBe(false);
      expect(validateConfidence(101).valid).toBe(false);
      expect(validateConfidence('abc').valid).toBe(false);
    });
  });

  describe('validateTimeRange', () => {
    it('should validate correct time ranges', () => {
      expect(validateTimeRange('24h').valid).toBe(true);
      expect(validateTimeRange('7d').valid).toBe(true);
      expect(validateTimeRange('30d').valid).toBe(true);
      expect(validateTimeRange('90d').valid).toBe(true);
      expect(validateTimeRange('all').valid).toBe(true);
    });

    it('should fail on invalid time ranges', () => {
      expect(validateTimeRange('').valid).toBe(false);
      expect(validateTimeRange('1h').valid).toBe(false);
      expect(validateTimeRange(null as any).valid).toBe(false);
    });
  });

  describe('validateSort', () => {
    const allowed = { id: true, name: true, created_at: true };

    it('should validate correct sort columns', () => {
      expect(validateSort('id', allowed).valid).toBe(true);
      expect(validateSort('NAME', allowed).valid).toBe(true);
    });

    it('should fail on invalid sort columns', () => {
      expect(validateSort('invalid', allowed).valid).toBe(false);
      expect(validateSort('', allowed).valid).toBe(false);
      expect(validateSort(null as any, allowed).valid).toBe(false);
    });
  });

  describe('validateSortOrder', () => {
    it('should validate correct sort orders', () => {
      expect(validateSortOrder('ASC').valid).toBe(true);
      expect(validateSortOrder('desc').valid).toBe(true);
      expect(validateSortOrder('').valid).toBe(true); // Defaults to DESC
    });

    it('should fail on invalid sort orders', () => {
      expect(validateSortOrder('INVALID').valid).toBe(false);
    });
  });

  describe('validateSeverity', () => {
    it('should validate correct severity scores', () => {
      expect(validateSeverity(0).valid).toBe(true);
      expect(validateSeverity(100).valid).toBe(true);
      expect(validateSeverity('75').valid).toBe(true);
    });

    it('should fail on invalid severity scores', () => {
      expect(validateSeverity(-5).valid).toBe(false);
      expect(validateSeverity(105).valid).toBe(false);
      expect(validateSeverity('abc').valid).toBe(false);
    });
  });

  describe('validateIntegerRange', () => {
    it('should validate integers within range', () => {
      expect(validateIntegerRange(10, 0, 20).valid).toBe(true);
      expect(validateIntegerRange('10', 0, 20).valid).toBe(true);
    });

    it('should fail on invalid values or out of range', () => {
      expect(validateIntegerRange('abc').valid).toBe(false);
      expect(validateIntegerRange(25, 0, 20).valid).toBe(false);
      expect(validateIntegerRange(-5, 0, 20).valid).toBe(false);
    });
  });

  describe('validateNumberRange', () => {
    it('should validate numbers within range', () => {
      expect(validateNumberRange(10.5, 0, 20).valid).toBe(true);
      expect(validateNumberRange('10.5', 0, 20).valid).toBe(true);
    });

    it('should fail on invalid values or out of range', () => {
      expect(validateNumberRange('abc').valid).toBe(false);
      expect(validateNumberRange(25.5, 0, 20).valid).toBe(false);
      expect(validateNumberRange(-0.1, 0, 20).valid).toBe(false);
    });
  });

  describe('combineValidations', () => {
    it('should return valid if all results are valid', () => {
      const result = combineValidations({ valid: true }, { valid: true });
      expect(result.valid).toBe(true);
    });

    it('should return errors if any result is invalid', () => {
      const result = combineValidations(
        { valid: true },
        { valid: false, error: 'Error 1' },
        { valid: false, error: 'Error 2' }
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Error 1', 'Error 2']);
    });
  });
});
