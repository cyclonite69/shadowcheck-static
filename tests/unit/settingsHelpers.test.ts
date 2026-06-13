const mockGetConfiguredAwsRegion = jest.fn();
jest.mock('../../server/src/services/awsService', () => ({
  getConfiguredAwsRegion: (...args: any[]) => mockGetConfiguredAwsRegion(...args),
}));

const mockValidateStringSchema = jest.fn();
jest.mock('../../server/src/validation/schemas', () => ({
  validateString: (...args: any[]) => mockValidateStringSchema(...args),
}));

const settingsHelpers = require('../../server/src/api/routes/v1/settingsHelpers');

describe('settingsHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getErrorMessage', () => {
    it('returns error.message for Error instances', () => {
      const err = new Error('test message');
      expect(settingsHelpers.getErrorMessage(err)).toBe('test message');
    });

    it('returns string representation for other types', () => {
      expect(settingsHelpers.getErrorMessage('custom error')).toBe('custom error');
      expect(settingsHelpers.getErrorMessage(123)).toBe('123');
    });
  });

  describe('getIncomingValue', () => {
    it('returns primary value if present', () => {
      const body = { primary: 'val1', fallback: 'val2' };
      expect(settingsHelpers.getIncomingValue(body, 'primary', 'fallback')).toBe('val1');
    });

    it('returns fallback value if primary is missing', () => {
      const body = { fallback: 'val2' };
      expect(settingsHelpers.getIncomingValue(body, 'primary', 'fallback')).toBe('val2');
    });

    it('returns default fallback (value) if fallbackKey is not specified', () => {
      const body = { value: 'valDefault' };
      expect(settingsHelpers.getIncomingValue(body, 'primary')).toBe('valDefault');
    });
  });

  describe('validateMapboxToken', () => {
    it('returns invalid if schema validation fails', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: false, error: 'too long' });
      const res = settingsHelpers.validateMapboxToken('token');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('too long');
    });

    it('returns invalid if token does not start with pk. or sk.', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: true });
      const res = settingsHelpers.validateMapboxToken('invalid-prefix');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('must start with');
    });

    it('returns valid and trimmed token if prefixes are correct', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: true });
      const res = settingsHelpers.validateMapboxToken(' pk.123 ');
      expect(res.valid).toBe(true);
      expect(res.value).toBe('pk.123');
    });
  });

  describe('validateLabel', () => {
    it('returns trimmed string when valid', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: true });
      const res = settingsHelpers.validateLabel(' mylabel ');
      expect(res.valid).toBe(true);
      expect(res.value).toBe('mylabel');
    });
  });

  describe('validateGoogleMapsKey', () => {
    it('returns trimmed key when valid', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: true });
      const res = settingsHelpers.validateGoogleMapsKey(' key ');
      expect(res.valid).toBe(true);
      expect(res.value).toBe('key');
    });
  });

  describe('validateGenericKey', () => {
    it('returns trimmed value when valid', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: true });
      const res = settingsHelpers.validateGenericKey(' val ', 'myfield');
      expect(res.valid).toBe(true);
      expect(res.value).toBe('val');
      expect(mockValidateStringSchema).toHaveBeenCalledWith(' val ', 1, 255, 'myfield');
    });
  });

  describe('validateAwsRegion', () => {
    it('returns trimmed region when valid', () => {
      mockValidateStringSchema.mockReturnValueOnce({ valid: true });
      const res = settingsHelpers.validateAwsRegion(' us-east-1 ');
      expect(res.valid).toBe(true);
      expect(res.value).toBe('us-east-1');
    });
  });
});
