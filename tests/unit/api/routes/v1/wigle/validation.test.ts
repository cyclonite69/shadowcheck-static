import { validateWigleSearchQuery, validateWigleNetworksQuery } from '../../../../../../server/src/api/routes/v1/wigle/validation';

describe('wigle/validation', () => {
  describe('validateWigleSearchQuery', () => {
    it('accepts valid ssid parameter', () => {
      const result = validateWigleSearchQuery({
        ssid: 'TestNetwork',
      });
      expect(result).toHaveProperty('ssid');
    });

    it('accepts valid bssid parameter', () => {
      const result = validateWigleSearchQuery({
        bssid: 'aa:bb:cc:dd:ee:ff',
      });
      expect(result).toHaveProperty('bssid');
    });

    it('accepts valid limit parameter', () => {
      const result = validateWigleSearchQuery({
        limit: '100',
      });
      expect(result).toHaveProperty('limit');
    });

    it('accepts combination of valid parameters', () => {
      const result = validateWigleSearchQuery({
        ssid: 'Network',
        bssid: 'aa:bb:cc:dd:ee:ff',
        limit: '50',
      });
      expect(result).toHaveProperty('ssid');
      expect(result).toHaveProperty('bssid');
      expect(result).toHaveProperty('limit');
    });

    it('handles optional parameters (all undefined)', () => {
      const result = validateWigleSearchQuery({});
      expect(result).toBeDefined();
    });
  });

  describe('validateWigleNetworksQuery', () => {
    it('accepts valid limit parameter', () => {
      const result = validateWigleNetworksQuery({
        limit: '100',
      });
      expect(result).toHaveProperty('limit');
    });

    it('accepts valid offset parameter', () => {
      const result = validateWigleNetworksQuery({
        offset: '0',
      });
      expect(result).toHaveProperty('offset');
    });

    it('accepts valid type parameter', () => {
      const result = validateWigleNetworksQuery({
        type: 'WiFi',
      });
      expect(result).toHaveProperty('type');
    });

    it('accepts combination of valid parameters', () => {
      const result = validateWigleNetworksQuery({
        limit: '100',
        offset: '50',
        type: 'WiFi',
      });
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      expect(result).toHaveProperty('type');
    });

    it('handles optional parameters (all undefined)', () => {
      const result = validateWigleNetworksQuery({});
      expect(result).toBeDefined();
    });

    it('accepts offset at minimum boundary (0)', () => {
      const result = validateWigleNetworksQuery({
        offset: '0',
      });
      expect(result).toBeDefined();
    });

    it('accepts offset within valid range', () => {
      const result = validateWigleNetworksQuery({
        offset: '5000000',
      });
      expect(result).toBeDefined();
    });
  });
});
