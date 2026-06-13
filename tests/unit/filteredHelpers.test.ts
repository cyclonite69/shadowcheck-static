const mockV2Service = {
  checkHomeExists: jest.fn(),
};
jest.mock('../../server/src/config/container', () => ({
  v2Service: mockV2Service,
}));

import {
  parseJsonParam,
  parseAndValidateFilters,
  normalizeThreatTransparency,
  buildOrderBy,
  assertHomeExistsIfNeeded,
} from '../../server/src/api/routes/v2/filteredHelpers';

describe('v2 filteredHelpers', () => {
  describe('parseJsonParam', () => {
    it('returns fallback if value is empty', () => {
      expect(parseJsonParam(undefined, { a: 1 }, 'test')).toEqual({ a: 1 });
      expect(parseJsonParam('', { a: 1 }, 'test')).toEqual({ a: 1 });
    });

    it('parses valid JSON', () => {
      expect(parseJsonParam('{"b": 2}', {}, 'test')).toEqual({ b: 2 });
    });

    it('throws error for invalid JSON', () => {
      expect(() => parseJsonParam('invalid', {}, 'test')).toThrow('Invalid JSON for test');
    });
  });

  describe('parseAndValidateFilters', () => {
    let mockValidatePayload: jest.Mock;

    beforeEach(() => {
      mockValidatePayload = jest.fn().mockReturnValue({ errors: [] });
    });

    it('parses and validates valid parameters', () => {
      const mockReq = {
        query: {
          filters: '{"distanceFromHomeMin":2}',
          enabled: '{"distanceFromHomeMin":true}',
        },
      } as any;

      const result = parseAndValidateFilters(mockReq, mockValidatePayload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.filters).toEqual({ distanceFromHomeMin: 2 });
        expect(result.enabled).toEqual({ distanceFromHomeMin: true });
      }
    });

    it('returns 400 status if parsing throws error', () => {
      const mockReq = {
        query: {
          filters: 'invalid',
        },
      } as any;

      const result = parseAndValidateFilters(mockReq, mockValidatePayload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.body.error).toContain('Invalid JSON for filters');
      }
    });

    it('returns 400 with errors if payload validation fails', () => {
      mockValidatePayload.mockReturnValueOnce({ errors: ['Invalid range value'] });
      const mockReq = {
        query: {
          filters: '{"val": 5}',
          enabled: '{"val": true}',
        },
      } as any;

      const result = parseAndValidateFilters(mockReq, mockValidatePayload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.body.errors).toEqual(['Invalid range value']);
      }
    });
  });

  describe('normalizeThreatTransparency', () => {
    it('returns defaults for null or empty threat', () => {
      const result = normalizeThreatTransparency(null);
      expect(result.threatReasons).toEqual([]);
      expect(result.threatEvidence).toEqual([]);
      expect(result.transparencyError).toBe(false);
    });

    it('extracts threat flags directly', () => {
      const threat = {
        flags: ['SUSPICIOUS_SSID', 'EXCESSIVE_MOVEMENT'],
        signals: [{ code: 'SPEED_PATTERN', evidence: { speed: 45 } }],
      };

      const result = normalizeThreatTransparency(threat);

      expect(result.threatReasons).toEqual(['SUSPICIOUS_SSID', 'EXCESSIVE_MOVEMENT']);
      expect(result.threatEvidence[0]).toEqual({
        rule: 'SPEED_PATTERN',
        observedValue: 45,
        threshold: 20,
      });
      expect(result.transparencyError).toBe(false);
    });

    it('extracts signal codes when flags are empty', () => {
      const threat = {
        signals: [
          { code: 'SPEED_PATTERN', evidence: { speed: 25 } },
          { code: 'EXCESSIVE_MOVEMENT', evidence: { variance: 0.5 } },
        ],
      };

      const result = normalizeThreatTransparency(threat);

      expect(result.threatReasons).toEqual(['SPEED_PATTERN', 'EXCESSIVE_MOVEMENT']);
      expect(result.transparencyError).toBe(false);
    });

    it('sets transparencyError to true if flagged but reasons list is empty', () => {
      const threat = {
        score: 75,
        level: 'HIGH',
        flags: [],
        signals: [],
      };

      const result = normalizeThreatTransparency(threat);

      expect(result.threatReasons).toEqual(['MISSING_THREAT_REASONS']);
      expect(result.transparencyError).toBe(true);
    });
  });

  describe('buildOrderBy', () => {
    it('returns default order clause with bssid tiebreaker', () => {
      const clause = buildOrderBy(undefined, undefined);
      expect(clause).toContain('ne.last_seen DESC');
      expect(clause).toContain('ne.bssid ASC');
    });

    it('resolves sorting mapping for threat and other columns', () => {
      const clause = buildOrderBy('threat,ssid', 'desc,asc');
      expect(clause).toContain('CASE UPPER(COALESCE(ne.threat_level');
      expect(clause).toContain("LOWER(COALESCE(ne.ssid, '')) ASC");
    });
  });

  describe('assertHomeExistsIfNeeded', () => {
    let mockRes: any;
    let mockV2Service: any;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockV2Service = require('../../server/src/config/container').v2Service;
    });

    it('returns true if no distance filters are enabled', async () => {
      const result = await assertHomeExistsIfNeeded({}, mockRes);
      expect(result).toBe(true);
    });

    it('checks home exists and returns true if home exists', async () => {
      mockV2Service.checkHomeExists.mockResolvedValueOnce(true);
      const result = await assertHomeExistsIfNeeded({ distanceFromHomeMin: true }, mockRes);
      expect(result).toBe(true);
    });

    it('returns false and responds with 400 if home does not exist', async () => {
      mockV2Service.checkHomeExists.mockResolvedValueOnce(false);
      const result = await assertHomeExistsIfNeeded({ distanceFromHomeMin: true }, mockRes);
      expect(result).toBe(false);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Home location is required for distance filters.',
      });
    });

    it('returns false and reports missing table error if db throws 42P01', async () => {
      const error: any = new Error('Table missing');
      error.code = '42P01';
      mockV2Service.checkHomeExists.mockRejectedValueOnce(error);

      const result = await assertHomeExistsIfNeeded({ distanceFromHomeMax: true }, mockRes);

      expect(result).toBe(false);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Home location markers table is missing (app.location_markers).',
      });
    });

    it('throws original error for other DB exceptions', async () => {
      mockV2Service.checkHomeExists.mockRejectedValueOnce(new Error('Connection failure'));

      await expect(
        assertHomeExistsIfNeeded({ distanceFromHomeMin: true }, mockRes)
      ).rejects.toThrow('Connection failure');
    });
  });
});
