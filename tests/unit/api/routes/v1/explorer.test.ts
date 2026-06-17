const explorerReexport = require('../../../../../server/src/api/routes/v1/explorer');

describe('Explorer Re-export', () => {
  it('should re-export the modular router', () => {
    expect(explorerReexport).toBeDefined();
    expect(typeof explorerReexport).toBe('function');
    expect(explorerReexport.name).toBe('router');
    expect(explorerReexport.stack).toBeDefined();
  });
});
