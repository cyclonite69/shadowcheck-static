const express = require('express');
const router = express.Router();
const secretsManager = require('../../../services/secretsManager');

// GET / - Root redirect to index.html
router.get('/', (req, res) => {
  res.redirect('/index.html');
});

// GET /api/mapbox-token - Get Mapbox API token
router.get('/mapbox-token', async (req, res) => {
  try {
    const token = await secretsManager.get('mapbox_token_default');
    
    if (!token) {
      return res.status(500).json({
        error: 'Mapbox token not configured',
        message: 'MAPBOX_TOKEN is not available in secrets'
      });
    }

    res.json({
      token: token,
      ok: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
