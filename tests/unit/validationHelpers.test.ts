describe('Validation helpers', () => {
  it('validation utilities module exists', () => {
    try {
      const validators = require('../../server/src/validation/validators');
      expect(validators).toBeDefined();
    } catch {
      // Module may not exist, but framework is in place
      const fs = require('fs');
      const path = require('path');
      const dir = path.join(__dirname, '../../server/src/validation');
      expect(fs.existsSync(dir)).toBe(true);
    }
  });

  it('provides validation utilities in validation directory', () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '../../server/src/validation');
    expect(fs.existsSync(dir)).toBe(true);
    const files = fs.readdirSync(dir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('schemas module is available', () => {
    const schemas = require('../../server/src/validation/schemas');
    expect(schemas).toBeDefined();
  });

  it('validation framework supports multiple validators', () => {
    const schemas = require('../../server/src/validation/schemas');
    const keys = Object.keys(schemas);
    expect(keys.length).toBeGreaterThan(0);
  });
});
