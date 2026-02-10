/**
 * Manufacturer Routes
 * Device manufacturer lookup by BSSID
 */

import express from 'express';
const router = express.Router();
import { query } from '../../../../config/database';
import { validateBSSID } from '../../../../validation/schemas';

/**
 * GET /manufacturer/:bssid - Lookup manufacturer by BSSID
 */
router.get('/manufacturer/:bssid', async (req, res, next) => {
  try {
    const { bssid } = req.params;

    const bssidValidation = validateBSSID(bssid);
    if (!bssidValidation.valid) {
      return res.status(400).json({ error: bssidValidation.error });
    }

    const prefix = bssidValidation.cleaned.replace(/:/g, '').substring(0, 6).toUpperCase();

    const { rows } = await query(
      `SELECT oui_prefix_24bit as prefix, organization_name as manufacturer, organization_address as address
       FROM app.radio_manufacturers WHERE oui_prefix_24bit = $1 LIMIT 1`,
      [prefix]
    );

    if (rows.length === 0) {
      return res.json({
        ok: true,
        bssid: bssidValidation.cleaned,
        manufacturer: 'Unknown',
        prefix: prefix,
      });
    }

    res.json({
      ok: true,
      bssid: bssidValidation.cleaned,
      manufacturer: rows[0].manufacturer,
      address: rows[0].address,
      prefix: rows[0].prefix,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
