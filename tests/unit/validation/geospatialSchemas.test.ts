/**
 * Geospatial Schemas Unit Tests
 */

import {
  validateLatitude,
  validateLongitude,
  validateBoundingBox,
  validateRadius,
  validateGeoJSONPoint,
  validateRadiusSearch,
  validateUSState,
  validateCountryCode,
  validatePostalCode,
} from '../../../server/src/validation/schemas/geospatialSchemas';

describe('Geospatial Validation Schemas', () => {
  describe('validateLatitude()', () => {
    it('should validate correct latitude', () => {
      expect(validateLatitude(40.7128).valid).toBe(true);
      expect(validateLatitude('40.7128').valid).toBe(true);
      expect(validateLatitude(-90).valid).toBe(true);
      expect(validateLatitude(90).valid).toBe(true);
    });

    it('should fail for out of range latitude', () => {
      expect(validateLatitude(-91).valid).toBe(false);
      expect(validateLatitude(91).valid).toBe(false);
    });
  });

  describe('validateLongitude()', () => {
    it('should validate correct longitude', () => {
      expect(validateLongitude(-74.006).valid).toBe(true);
      expect(validateLongitude('-74.006').valid).toBe(true);
      expect(validateLongitude(-180).valid).toBe(true);
      expect(validateLongitude(180).valid).toBe(true);
    });

    it('should fail for out of range longitude', () => {
      expect(validateLongitude(-181).valid).toBe(false);
      expect(validateLongitude(181).valid).toBe(false);
    });
  });

  describe('validateBoundingBox()', () => {
    it('should validate correct bounding box array', () => {
      const result = validateBoundingBox([-74.1, 40.7, -73.9, 40.8]);
      expect(result.valid).toBe(true);
    });

    it('should validate correct bounding box string', () => {
      const result = validateBoundingBox('-74.1, 40.7, -73.9, 40.8');
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid order (min > max)', () => {
      expect(validateBoundingBox([-73.9, 40.7, -74.1, 40.8]).valid).toBe(false);
      expect(validateBoundingBox([-74.1, 40.8, -73.9, 40.7]).valid).toBe(false);
    });

    it('should fail for incorrect length', () => {
      expect(validateBoundingBox([-74.1, 40.7, -73.9]).valid).toBe(false);
    });
  });

  describe('validateRadius()', () => {
    it('should validate positive radius', () => {
      expect(validateRadius(1000).valid).toBe(true);
      expect(validateRadius('5000').valid).toBe(true);
    });

    it('should fail for negative or zero radius', () => {
      expect(validateRadius(0).valid).toBe(false);
      expect(validateRadius(-100).valid).toBe(false);
    });

    it('should fail for radius exceeding max', () => {
      expect(validateRadius(60000).valid).toBe(false);
    });
  });

  describe('validateGeoJSONPoint()', () => {
    it('should validate correct Point object', () => {
      const point = { type: 'Point', coordinates: [-74.006, 40.7128] };
      expect(validateGeoJSONPoint(point as any).valid).toBe(true);
    });

    it('should fail for invalid type', () => {
      const point = { type: 'NotAPoint', coordinates: [-74.006, 40.7128] };
      expect(validateGeoJSONPoint(point as any).valid).toBe(false);
    });
  });

  describe('validateRadiusSearch()', () => {
    it('should validate correct search params', () => {
      const params = { lat: 40.7128, lng: -74.006, radius: 1000 };
      expect(validateRadiusSearch(params).valid).toBe(true);
    });

    it('should fail for missing params', () => {
      expect(validateRadiusSearch({ lat: 40.7128, lng: -74.006 }).valid).toBe(false);
    });
  });

  describe('validateUSState()', () => {
    it('should validate correct state code', () => {
      expect(validateUSState('CA').valid).toBe(true);
      expect(validateUSState('ny ').valid).toBe(true);
    });

    it('should fail for invalid state code', () => {
      expect(validateUSState('XX').valid).toBe(false);
      expect(validateUSState('CAlifornia').valid).toBe(false);
      expect(validateUSState(null as any).valid).toBe(false);
    });
  });

  describe('validateCountryCode()', () => {
    it('should validate correct country code', () => {
      expect(validateCountryCode('US').valid).toBe(true);
      expect(validateCountryCode('ca').valid).toBe(true);
    });

    it('should fail for invalid country code', () => {
      expect(validateCountryCode('USA').valid).toBe(false);
      expect(validateCountryCode('12').valid).toBe(false);
      expect(validateCountryCode(null as any).valid).toBe(false);
    });
  });

  describe('validatePostalCode()', () => {
    it('should validate postal code', () => {
      expect(validatePostalCode('12345').valid).toBe(true);
      expect(validatePostalCode('A1B 2C3').valid).toBe(true);
    });

    it('should fail for too long postal code', () => {
      expect(validatePostalCode('x'.repeat(21)).valid).toBe(false);
    });

    it('should fail for null/undefined', () => {
      expect(validatePostalCode(null as any).valid).toBe(false);
    });
  });
});
