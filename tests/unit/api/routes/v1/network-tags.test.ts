const networkTagsReexport = require('../../../../../server/src/api/routes/v1/network-tags');

describe('Network Tags Re-export', () => {
  it('should re-export the modular router', () => {
    expect(networkTagsReexport).toBeDefined();
    expect(typeof networkTagsReexport).toBe('function');
    expect(networkTagsReexport.name).toBe('router');
    expect(networkTagsReexport.stack).toBeDefined();
  });
});
