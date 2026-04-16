import { 
  validateWigleSearchQuery, 
  validateWigleNetworksQuery 
} from '../../server/src/api/routes/v1/wigle/validation';

describe('wigleValidation', () => {
  it('should export validation middleware', () => {
    expect(validateWigleSearchQuery).toBeDefined();
    expect(validateWigleNetworksQuery).toBeDefined();
  });
});
