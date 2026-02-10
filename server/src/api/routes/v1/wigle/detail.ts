/**
 * WiGLE Detail & Import Routes
 * WiGLE API detail lookups and file imports
 */

import express from 'express';
const router = express.Router();
import { query } from '../../../../config/database';
import secretsManager from '../../../../services/secretsManager';
import logger from '../../../../logging/logger';
import { requireAdmin } from '../../../../middleware/authMiddleware';
import { withRetry } from '../../../../services/externalServiceHandler';

const stripNullBytes = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/\u0000/g, '');
  return cleaned === '' ? null : cleaned;
};

const stripNullBytesKeepEmpty = (value: any): any => {
  if (value === undefined || value === null) return value;
  return String(value).replace(/\u0000/g, '');
};

const stripNullBytesDeep = (value: any): any => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') return stripNullBytesKeepEmpty(value);
  if (Array.isArray(value)) return value.map((item) => stripNullBytesDeep(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, stripNullBytesDeep(val)])
    );
  }
  return value;
};

async function importWigleV3Observations(netid: string, locationClusters: any[]): Promise<number> {
  if (!locationClusters || !Array.isArray(locationClusters)) return 0;

  let totalImported = 0;
  for (const cluster of locationClusters) {
    if (!cluster.locations || !Array.isArray(cluster.locations)) continue;

    for (const loc of cluster.locations) {
      try {
        const ssidToUse =
          loc.ssid && loc.ssid !== '?' && loc.ssid !== ''
            ? loc.ssid
            : cluster.clusterSsid || loc.ssid;
        const sanitizedSsid = stripNullBytes(ssidToUse);

        await query(
          `INSERT INTO app.wigle_v3_observations (
            netid, latitude, longitude, altitude, accuracy,
            signal, observed_at, last_update, ssid,
            frequency, channel, encryption, noise, snr, month, location
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            ST_SetSRID(ST_MakePoint($3, $2), 4326)
          ) ON CONFLICT DO NOTHING`,
          [
            netid,
            parseFloat(loc.latitude),
            parseFloat(loc.longitude),
            parseFloat(loc.alt) || null,
            parseFloat(loc.accuracy) || null,
            parseInt(loc.signal) || null,
            loc.time,
            loc.lastupdt,
            sanitizedSsid,
            parseInt(loc.frequency) || null,
            parseInt(loc.channel) || null,
            stripNullBytes(loc.encryptionValue),
            parseInt(loc.noise) || null,
            parseInt(loc.snr) || null,
            loc.month,
          ]
        );
        totalImported++;
      } catch (err: any) {
        logger.error(`[WiGLE] Failed to import observation for ${netid}: ${err.message}`);
      }
    }
  }
  return totalImported;
}

async function fetchWigleDetail(netid: string, endpoint: string) {
  const wigleApiName = secretsManager.get('wigle_api_name');
  const wigleApiToken = secretsManager.get('wigle_api_token');

  if (!wigleApiName || !wigleApiToken) {
    return { ok: false, status: 503, error: 'WiGLE API credentials not configured' };
  }

  const encodedAuth = Buffer.from(`${wigleApiName}:${wigleApiToken}`).toString('base64');
  const apiUrl = `https://api.wigle.net/api/v3/detail/${endpoint}/${encodeURIComponent(netid)}`;

  logger.info(`[WiGLE] Fetching ${endpoint} detail for: ${netid}`);

  const response = await withRetry(
    () =>
      fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${encodedAuth}`,
          Accept: 'application/json',
        },
      }),
    { serviceName: 'WiGLE Detail API', timeoutMs: 15000, maxRetries: 2 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[WiGLE] Detail API error ${response.status}: ${errorText}`);
    return {
      ok: false,
      status: response.status,
      error: 'WiGLE Detail API request failed',
      details: errorText,
    };
  }

  const data = await response.json();
  return { ok: true, data };
}

async function handleWigleDetailRequest(req: any, res: any, next: any, endpoint: string) {
  try {
    const { netid } = req.params;
    const shouldImport = req.body?.import === true;

    const detailResponse = await fetchWigleDetail(netid, endpoint);

    if (!detailResponse.ok) {
      return res.status(detailResponse.status).json({
        ok: false,
        error: detailResponse.error,
        status: detailResponse.status,
        details: (detailResponse as any).details,
      });
    }

    const data = (detailResponse as any).data;
    const normalizedData = stripNullBytesDeep(data);
    let importedObservations = 0;

    if (shouldImport && data.networkId) {
      const sanitizedName = stripNullBytes(data.name);
      const sanitizedComment = stripNullBytes(data.comment);
      const sanitizedSsid = stripNullBytes(data.locationClusters?.[0]?.clusterSsid || data.name);
      const sanitizedEncryption = stripNullBytes(data.encryption);
      const sanitizedFreenet = stripNullBytes(data.freenet);
      const sanitizedDhcp = stripNullBytes(data.dhcp);
      const sanitizedPaynet = stripNullBytes(data.paynet);

      logger.info(`[WiGLE] Importing detail for ${netid} to database...`);

      await query(
        `INSERT INTO app.wigle_v3_network_details (
          netid, name, type, comment, ssid, trilat, trilon, encryption, channel,
          bcninterval, freenet, dhcp, paynet, qos, first_seen, last_seen, last_update,
          street_address, location_clusters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (netid) DO UPDATE SET
          name = EXCLUDED.name, type = EXCLUDED.type, comment = EXCLUDED.comment,
          ssid = EXCLUDED.ssid, trilat = EXCLUDED.trilat, trilon = EXCLUDED.trilon,
          encryption = EXCLUDED.encryption, channel = EXCLUDED.channel,
          bcninterval = EXCLUDED.bcninterval, freenet = EXCLUDED.freenet,
          dhcp = EXCLUDED.dhcp, paynet = EXCLUDED.paynet, qos = EXCLUDED.qos,
          first_seen = EXCLUDED.first_seen, last_seen = EXCLUDED.last_seen,
          last_update = EXCLUDED.last_update, street_address = EXCLUDED.street_address,
          location_clusters = EXCLUDED.location_clusters, imported_at = NOW()`,
        [
          data.networkId,
          sanitizedName,
          data.type,
          sanitizedComment,
          sanitizedSsid,
          data.trilateratedLatitude,
          data.trilateratedLongitude,
          sanitizedEncryption,
          data.channel,
          data.bcninterval,
          sanitizedFreenet,
          sanitizedDhcp,
          sanitizedPaynet,
          data.bestClusterWiGLEQoS,
          data.firstSeen,
          data.lastSeen,
          data.lastUpdate,
          JSON.stringify(data.streetAddress),
          JSON.stringify(data.locationClusters),
        ]
      );

      importedObservations = await importWigleV3Observations(data.networkId, data.locationClusters);
      logger.info(`[WiGLE] Imported ${importedObservations} observations for ${netid}`);
    }

    res.json({ ok: true, data: normalizedData, imported: shouldImport, importedObservations });
  } catch (err: any) {
    logger.error(`[WiGLE] Detail error: ${err.message}`, { error: err });
    next(err);
  }
}

/**
 * POST /detail/:netid - Fetch WiGLE v3 WiFi detail and optionally import
 */
router.post('/detail/:netid', requireAdmin, async (req, res, next) => {
  await handleWigleDetailRequest(req, res, next, 'wifi');
});

/**
 * POST /detail/bt/:netid - Fetch WiGLE v3 Bluetooth detail and optionally import
 */
router.post('/detail/bt/:netid', requireAdmin, async (req, res, next) => {
  await handleWigleDetailRequest(req, res, next, 'bt');
});

/**
 * POST /import/v3 - Import WiGLE v3 detail JSON file
 */
router.post('/import/v3', requireAdmin, async (req, res, next) => {
  try {
    if (!req.files || !(req.files as any).file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const file = (req.files as any).file;
    const jsonString = file.data.toString('utf8');
    let data;

    try {
      data = JSON.parse(jsonString);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON file' });
    }

    if (!data.networkId) {
      return res.status(400).json({ ok: false, error: 'JSON missing networkId field' });
    }

    const sanitizedName = stripNullBytes(data.name);
    const sanitizedComment = stripNullBytes(data.comment);
    const sanitizedSsid = stripNullBytes(data.locationClusters?.[0]?.clusterSsid || data.name);
    const sanitizedEncryption = stripNullBytes(data.encryption);
    const sanitizedFreenet = stripNullBytes(data.freenet);
    const sanitizedDhcp = stripNullBytes(data.dhcp);
    const sanitizedPaynet = stripNullBytes(data.paynet);

    logger.info(`[WiGLE] Importing v3 detail for ${data.networkId} from file...`);

    await query(
      `INSERT INTO app.wigle_v3_network_details (
        netid, name, type, comment, ssid, trilat, trilon, encryption, channel,
        bcninterval, freenet, dhcp, paynet, qos, first_seen, last_seen, last_update,
        street_address, location_clusters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (netid) DO UPDATE SET
        name = EXCLUDED.name, type = EXCLUDED.type, comment = EXCLUDED.comment,
        ssid = EXCLUDED.ssid, trilat = EXCLUDED.trilat, trilon = EXCLUDED.trilon,
        encryption = EXCLUDED.encryption, channel = EXCLUDED.channel,
        bcninterval = EXCLUDED.bcninterval, freenet = EXCLUDED.freenet,
        dhcp = EXCLUDED.dhcp, paynet = EXCLUDED.paynet, qos = EXCLUDED.qos,
        first_seen = EXCLUDED.first_seen, last_seen = EXCLUDED.last_seen,
        last_update = EXCLUDED.last_update, street_address = EXCLUDED.street_address,
        location_clusters = EXCLUDED.location_clusters, imported_at = NOW()`,
      [
        data.networkId,
        sanitizedName,
        data.type,
        sanitizedComment,
        sanitizedSsid,
        data.trilateratedLatitude,
        data.trilateratedLongitude,
        sanitizedEncryption,
        data.channel,
        data.bcninterval,
        sanitizedFreenet,
        sanitizedDhcp,
        sanitizedPaynet,
        data.bestClusterWiGLEQoS,
        data.firstSeen,
        data.lastSeen,
        data.lastUpdate,
        JSON.stringify(data.streetAddress),
        JSON.stringify(data.locationClusters),
      ]
    );

    const importedObservations = await importWigleV3Observations(
      data.networkId,
      data.locationClusters
    );
    logger.info(`[WiGLE] Imported ${importedObservations} observations for ${data.networkId}`);

    res.json({ ok: true, data: stripNullBytesDeep(data), importedObservations });
  } catch (err: any) {
    logger.error(`[WiGLE] Import error: ${err.message}`, { error: err });
    next(err);
  }
});

export default router;
