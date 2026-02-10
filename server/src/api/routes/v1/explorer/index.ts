/**
 * Explorer Routes - Main Router
 * Modular organization of explorer endpoints
 */

import express from 'express';
const router = express.Router();

// Temporarily load from parent explorer.ts
const explorerRoutes = require('../explorer');
router.use('/', explorerRoutes);

export default router;
