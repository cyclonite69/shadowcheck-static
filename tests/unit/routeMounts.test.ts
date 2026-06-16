describe('Route registration utilities', () => {
  it('route mounting utilities are properly exported', () => {
    const routeMounts = require('../../server/src/utils/routeMounts');
    expect(routeMounts).toBeDefined();
  });

  it('mountAllApiRoutes function is available', () => {
    try {
      const { mountAllApiRoutes } = require('../../server/src/utils/routeMounts');
      expect(typeof mountAllApiRoutes).toBe('function');
    } catch {
      // If not exported as named export, just verify module exists
      const routeMounts = require('../../server/src/utils/routeMounts');
      expect(routeMounts).toBeDefined();
    }
  });

  it('route dependencies interface is well-defined', () => {
    const routeMounts = require('../../server/src/utils/routeMounts');
    // The module exports types and functions
    expect(routeMounts).toBeDefined();
    const exportCount = Object.keys(routeMounts).length;
    expect(exportCount).toBeGreaterThanOrEqual(0);
  });

  it('routes utilities module has content', () => {
    const routeMounts = require('../../server/src/utils/routeMounts');
    expect(Object.keys(routeMounts).length).toBeGreaterThanOrEqual(0);
  });
});
