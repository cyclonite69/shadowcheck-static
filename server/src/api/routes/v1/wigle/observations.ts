/**
 * WiGLE Observations Routes
 * Fetch stored observation data
 */

import express from 'express';
const router = express.Router();
import { query } from '../../../../config/database';

/**
 * GET /observations/:netid - Fetch stored individual observations
 */
router.get('/observations/:netid', async (req, res, next) => {
  try {
    const { netid } = req.params;

    const { rows } = await query(
      `SELECT id, netid, latitude, longitude, altitude, accuracy,
              signal, observed_at, last_update, ssid,
              frequency, channel, encryption, noise, snr, month
       FROM app.wigle_v3_observations
       WHERE netid = $1
       ORDER BY observed_at DESC`,
      [netid]
    );

    res.json({
      ok: true,
      count: rows.length,
      observations: rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
