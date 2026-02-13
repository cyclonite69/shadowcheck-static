/**
 * Networks Routes - Main Router
 * Modular organization of network endpoints
 */

export {};

const express = require('express');
const router = express.Router();

// Import modular route handlers (using require for CommonJS modules)
const manufacturerRoutes = require('./manufacturer');
const searchRoutes = require('./search');
const tagsRoutes = require('./tags');
const observationsRoutes = require('./observations');
const listRoutes = require('./list');

// Mount modular routes
router.use('/', manufacturerRoutes);
router.use('/', searchRoutes);
router.use('/', tagsRoutes);
router.use('/', observationsRoutes);
router.use('/', listRoutes);

module.exports = router;
