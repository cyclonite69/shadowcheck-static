/**
 * Complex Validators Unit Tests
 */

import {
  validateConfidence,
  validateSeverity,
  validateThreatLevel,
  validateNetworkStatus,
  validateLocation,
  validateNetworkForCreate,
  validateObservation,
  validateTag,
  validateFilters,
} from '../../../server/src/validation/schemas/complexValidators';

describe('Complex Validation Schemas', () => {
  describe('validateConfidence()', () => {
    it('should validate confidence between 0 and 100', () => {
      expect(validateConfidence(0).valid).toBe(true);
      expect(validateConfidence(50).valid).toBe(true);
      expect(validateConfidence(100).valid).toBe(true);
      expect(validateConfidence('75').valid).toBe(true);
    });

    it('should fail for confidence outside 0-100', () => {
      expect(validateConfidence(-1).valid).toBe(false);
      expect(validateConfidence(101).valid).toBe(false);
    });

    it('should fail for non-numeric confidence', () => {
      expect(validateConfidence('abc').valid).toBe(false);
    });
  });

  describe('validateSeverity()', () => {
    it('should validate severity between 0 and 100', () => {
      expect(validateSeverity(0).valid).toBe(true);
      expect(validateSeverity(100).valid).toBe(true);
    });

    it('should fail for severity outside 0-100', () => {
      expect(validateSeverity(-1).valid).toBe(false);
      expect(validateSeverity(101).valid).toBe(false);
    });
  });

  describe('validateThreatLevel()', () => {
    it('should validate correct threat levels', () => {
      expect(validateThreatLevel('LOW').valid).toBe(true);
      expect(validateThreatLevel('MEDIUM').valid).toBe(true);
      expect(validateThreatLevel('HIGH').valid).toBe(true);
      expect(validateThreatLevel('CRITICAL').valid).toBe(true);
    });

    it('should fail for invalid threat level', () => {
      expect(validateThreatLevel('INVALID').valid).toBe(false);
    });
  });

  describe('validateNetworkStatus()', () => {
    it('should validate correct network statuses', () => {
      expect(validateNetworkStatus('ACTIVE').valid).toBe(true);
      expect(validateNetworkStatus('INACTIVE').valid).toBe(true);
      expect(validateNetworkStatus('UNKNOWN').valid).toBe(true);
    });

    it('should fail for invalid status', () => {
      expect(validateNetworkStatus('INVALID').valid).toBe(false);
    });
  });

  describe('validateLocation()', () => {
    it('should validate location with latitude and longitude', () => {
      const result = validateLocation({ latitude: 45, longitude: 90 });
      expect(result.valid).toBe(true);
      expect(result.value).toEqual({ lat: 45, lng: 90 });
    });

    it('should handle lat/lng short names', () => {
      const result = validateLocation({ lat: -20, lng: 30 });
      expect(result.valid).toBe(true);
      expect(result.value).toEqual({ lat: -20, lng: 30 });
    });

    it('should fail for invalid latitude in location', () => {
      expect(validateLocation({ latitude: 'invalid', longitude: 90 }).valid).toBe(false);
    });

    it('should fail for invalid longitude in location', () => {
      expect(validateLocation({ latitude: 45, longitude: 'invalid' }).valid).toBe(false);
    });
  });

  describe('validateNetworkForCreate()', () => {
    const validNetwork = {
      bssid: '00:11:22:33:44:55',
      ssid: 'TestNetwork',
      latitude: 45.0,
      longitude: -75.0,
      status: 'ACTIVE',
    };

    it('should validate complete valid network', () => {
      const result = validateNetworkForCreate(validNetwork);
      expect(result.valid).toBe(true);
      expect(result.value?.status).toBe('ACTIVE');
    });

    it('should default status to UNKNOWN if not provided', () => {
      const result = validateNetworkForCreate({ ...validNetwork, status: undefined });
      expect(result.valid).toBe(true);
      expect(result.value?.status).toBe('UNKNOWN');
    });

    it('should fail for missing BSSID', () => {
      const result = validateNetworkForCreate({ ...validNetwork, bssid: undefined });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BSSID');
    });

    it('should fail for missing location', () => {
      const result = validateNetworkForCreate({ ...validNetwork, latitude: undefined });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Location');
    });

    it('should fail for invalid SSID', () => {
      const result = validateNetworkForCreate({ ...validNetwork, ssid: 'A'.repeat(100) });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SSID');
    });

    it('should fail for invalid status', () => {
      const result = validateNetworkForCreate({ ...validNetwork, status: 'INVALID' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Status');
    });
  });

  describe('validateObservation()', () => {
    const validObservation = {
      bssid: '00:11:22:33:44:55',
      ssid: 'TestNetwork',
      signal: -60,
      latitude: 45.0,
      longitude: -75.0,
      timestamp: new Date().toISOString(),
    };

    it('should validate complete valid observation', () => {
      const result = validateObservation(validObservation);
      expect(result.valid).toBe(true);
    });

    it('should validate minimal valid observation', () => {
      const result = validateObservation({ bssid: '00:11:22:33:44:55' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid BSSID', () => {
      const result = validateObservation({ bssid: 'INVALID!!!' });
      expect(result.valid).toBe(false);
    });

    it('should fail for invalid SSID', () => {
      const result = validateObservation({ ...validObservation, ssid: 'A'.repeat(100) });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SSID');
    });

    it('should fail for invalid signal', () => {
      const result = validateObservation({ ...validObservation, signal: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signal');
    });

    it('should fail for invalid location', () => {
      const result = validateObservation({ ...validObservation, latitude: 100 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Location');
    });

    it('should fail for invalid timestamp', () => {
      const result = validateObservation({ ...validObservation, timestamp: 'invalid-date' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timestamp');
    });
  });

  describe('validateTag()', () => {
    const validTag = {
      bssid: '00:11:22:33:44:55',
      tagType: 'THREAT',
      confidence: 90,
      threatLevel: 'HIGH',
      notes: 'Suspicious activity',
    };

    it('should validate complete valid tag', () => {
      const result = validateTag(validTag);
      expect(result.valid).toBe(true);
    });

    it('should validate minimal valid tag', () => {
      const result = validateTag({ bssid: '00:11:22:33:44:55' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid tag type', () => {
      const result = validateTag({ ...validTag, tagType: 'INVALID' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tag type');
    });

    it('should fail for invalid confidence', () => {
      const result = validateTag({ ...validTag, confidence: 150 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Confidence');
    });

    it('should fail for invalid threat level', () => {
      const result = validateTag({ ...validTag, threatLevel: 'CRITICAL_MAX' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Threat level');
    });

    it('should fail for invalid notes', () => {
      const result = validateTag({ ...validTag, notes: 123 as any });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Notes');
    });
  });

  describe('validateFilters()', () => {
    const validFilters = {
      bssid: '00:11:22:33:44:55',
      ssid: 'TestNetwork',
      boundingBox: '40, -80, 50, -70',
      status: 'ACTIVE',
      networkType: 'WIFI',
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-01-02T00:00:00Z',
      minSignal: -90,
      maxSignal: -30,
    };

    it('should validate complete valid filters', () => {
      const result = validateFilters(validFilters);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid BSSID filter', () => {
      const result = validateFilters({ bssid: '!!!' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BSSID');
    });

    it('should fail for invalid SSID filter', () => {
      const result = validateFilters({ ssid: 'A'.repeat(100) });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SSID');
    });

    it('should fail for invalid network status filter', () => {
      const result = validateFilters({ status: 'INVALID' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Status');
    });

    it('should fail for invalid network type filter', () => {
      const result = validateFilters({ networkType: 'INVALID' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network type');
    });

    it('should validate authentication and encryption filters', () => {
      const result = validateFilters({ authentication: 'WPA2', encryption: 'CCMP' });
      expect(result.valid).toBe(true);
    });


    it('should fail for invalid authentication or encryption filters', () => {
      expect(validateFilters({ authentication: 'INVALID' }).valid).toBe(false);
      expect(validateFilters({ encryption: 'INVALID' }).valid).toBe(false);
    });

    it('should fail if only startDate is provided', () => {
      const result = validateFilters({ startDate: '2023-01-01T00:00:00Z' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Both startDate and endDate are required');
    });

    it('should fail for invalid startDate or endDate', () => {
      expect(validateFilters({ startDate: 'invalid', endDate: '2023-01-01T00:00:00Z' }).valid).toBe(false);
      expect(validateFilters({ startDate: '2023-01-01T00:00:00Z', endDate: 'invalid' }).valid).toBe(false);
    });

    it('should fail if startDate is after endDate', () => {
      const result = validateFilters({
        startDate: '2023-01-02T00:00:00Z',
        endDate: '2023-01-01T00:00:00Z',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Start date must be before end date');
    });

    it('should fail for invalid bounding box', () => {
      const result = validateFilters({ boundingBox: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Bounding box');
    });

    it('should fail for invalid min/max signal', () => {
      expect(validateFilters({ minSignal: 10 }).valid).toBe(false);
      expect(validateFilters({ maxSignal: 10 }).valid).toBe(false);
    });
  });
});

