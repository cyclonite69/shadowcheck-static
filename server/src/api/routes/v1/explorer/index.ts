/**
 * Explorer Routes - Main Router
 * Modular organization of explorer endpoints
 */

export {};

const express = require('express');
const router = express.Router();

// Import modular route handlers
// Some use `export default` (compiled to { default: router }), others use module.exports
const resolveDefault = (m: any) => m.default || m;
const networksRoutes = resolveDefault(require('./networks'));

// Mount modular routes
router.use('/', networksRoutes);

module.exports = router;
