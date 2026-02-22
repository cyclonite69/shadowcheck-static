export {};
const express = require('express');
const router = express.Router();
const { homeLocationService } = require('../../../config/container');

// Get all location markers
router.get('/location-markers', async (req, res, next) => {
  try {
    const markers = await homeLocationService.getAllLocationMarkers();
    res.json({ ok: true, markers });
  } catch (err) {
    next(err);
  }
});

// Get home location
router.get('/location-markers/home', async (req, res, next) => {
  try {
    const marker = await homeLocationService.getHomeLocationMarker();
    res.json({ ok: true, marker: marker || null });
  } catch (err) {
    next(err);
  }
});

// Set home location (replaces existing for this device)
router.post('/location-markers/home', async (req, res, next) => {
  try {
    const { latitude, longitude, altitude_gps, altitude_baro, device_id, device_type } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ ok: false, error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const altGps = altitude_gps ? parseFloat(altitude_gps) : null;
    const altBaro = altitude_baro ? parseFloat(altitude_baro) : null;
    const devId = device_id || 'unknown';
    const devType = device_type || 'browser';

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ ok: false, error: 'Invalid coordinates' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ ok: false, error: 'Coordinates out of range' });
    }

    const marker = await homeLocationService.setHomeLocationMarker({
      lat,
      lng,
      altGps,
      altBaro,
      devId,
      devType,
    });

    res.json({ ok: true, marker });
  } catch (err) {
    next(err);
  }
});

// Delete home location
router.delete('/location-markers/home', async (req, res, next) => {
  try {
    await homeLocationService.deleteHomeLocation();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// TEST endpoint
router.get('/test-location', async (req, res) => {
  res.json({ message: 'Location routes working!' });
});

module.exports = router;
