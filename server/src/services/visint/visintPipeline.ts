import { extractExif } from './visintExif';
import { queryCorrelatedObservations } from './visintScorer';

const { query } = require('../../config/database');
const logger = require('../../logging/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { insertNetworkMedia } = require('../../repositories/adminNetworkMediaRepository');
const {
  addTagToNetwork,
  getNetworkTagsByBssid,
  insertNetworkTagWithNotes,
} = require('../../repositories/adminNetworkTagOuiRepository');

export async function saveVisINTAttachment(
  imageBuffer: Buffer,
  filename: string,
  targetBssid: string,
  status: 'MATCHED' | 'UNMATCHED',
  detectionScore: number,
  distMeters: number | null,
  deltaMinutes: number | null,
  lat?: number,
  lon?: number,
  ts?: string
): Promise<string[]> {
  const mimeType = String(filename).toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  let tagsToApply: string[] = [];

  if (status === 'MATCHED') {
    // Attach to matched network BSSID
    await insertNetworkMedia(
      targetBssid,
      'image',
      filename,
      imageBuffer.length,
      mimeType,
      imageBuffer,
      `VisINT Correlation Matched: dist_meters=${distMeters}, delta_minutes=${deltaMinutes}, score=${detectionScore}`
    );

    // Apply matched tags
    if (detectionScore === 3) {
      tagsToApply = ['FLOCK_NEW_FIRMWARE', 'VISINT_VERIFIED'];
    } else if (detectionScore === 2) {
      tagsToApply = ['FLOCK_LEGACY', 'VISINT_VERIFIED'];
    } else if (detectionScore === 1) {
      tagsToApply = ['FLOCK_CANDIDATE', 'VISINT_PENDING'];
    }
  } else {
    // Unmatched fallback
    const metadataDesc = JSON.stringify({
      extracted_lat: lat || 0,
      extracted_lon: lon || 0,
      extracted_ts: ts || '',
      status: 'UNMATCHED',
    });
    await insertNetworkMedia(
      targetBssid,
      'image',
      filename,
      imageBuffer.length,
      mimeType,
      imageBuffer,
      metadataDesc
    );

    tagsToApply = ['UNMATCHED_NODE', 'VISINT_UNMATCHED'];
  }

  if (/shot|spotter/i.test(filename)) {
    tagsToApply.push('SHOTSPOTTER');
  }

  // Save tags
  const existing = await getNetworkTagsByBssid(targetBssid);
  if (!existing) {
    await insertNetworkTagWithNotes(targetBssid, tagsToApply, null);
  } else {
    for (const tag of tagsToApply) {
      await addTagToNetwork(targetBssid, tag, null);
    }
  }

  return tagsToApply;
}

export async function correlateVisINT(
  imageBuffer: Buffer,
  filename: string,
  commit = true,
  radiusMeters = 50,
  windowHours = 2,
  limit = 5
): Promise<{
  status: 'MATCHED' | 'UNMATCHED';
  observation_id: string | null;
  detection_score: number;
  dist_meters: number | null;
  delta_minutes: number | null;
  tags_applied: string[];
  exif: { lat: number; lon: number; ts: string };
  candidates: any[];
}> {
  const tempFilePath = path.join(os.tmpdir(), `visint-${Date.now()}-${filename}`);
  fs.writeFileSync(tempFilePath, imageBuffer);

  let lat = 0;
  let lon = 0;
  let ts = '';

  try {
    const exifData = await extractExif(tempFilePath);
    lat = exifData.lat;
    lon = exifData.lon;
    ts = exifData.timestamp;
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupErr) {
      // ignore
    }
  }

  // Query database using custom spatial-temporal parameters and signature scoring
  const rows = await queryCorrelatedObservations(
    query,
    lon,
    lat,
    ts,
    radiusMeters,
    windowHours,
    limit
  );

  let status: 'MATCHED' | 'UNMATCHED' = 'UNMATCHED';
  let observationId: string | null = null;
  let detectionScore = 0;
  let distMeters: number | null = null;
  let deltaMinutes: number | null = null;
  let targetBssid = 'VISINT_UNMATCHED';
  let tagsToApply: string[] = [];

  if (rows.length > 0 && parseInt(rows[0].detection_score, 10) >= 1) {
    const bestMatch = rows[0];
    status = 'MATCHED';
    observationId = String(bestMatch.id);
    detectionScore = parseInt(bestMatch.detection_score, 10);
    distMeters = parseFloat(bestMatch.dist_meters);
    deltaMinutes = parseFloat(bestMatch.delta_minutes);
    targetBssid = String(bestMatch.bssid).toUpperCase();
  }

  if (commit) {
    tagsToApply = await saveVisINTAttachment(
      imageBuffer,
      filename,
      targetBssid,
      status,
      detectionScore,
      distMeters,
      deltaMinutes,
      lat,
      lon,
      ts
    );
  } else {
    // Determine preview tags to return
    if (status === 'MATCHED') {
      if (detectionScore === 3) {
        tagsToApply = ['FLOCK_NEW_FIRMWARE', 'VISINT_VERIFIED'];
      } else if (detectionScore === 2) {
        tagsToApply = ['FLOCK_LEGACY', 'VISINT_VERIFIED'];
      } else if (detectionScore === 1) {
        tagsToApply = ['FLOCK_CANDIDATE', 'VISINT_PENDING'];
      }
    } else {
      tagsToApply = ['UNMATCHED_NODE', 'VISINT_UNMATCHED'];
    }
    if (/shot|spotter/i.test(filename)) {
      tagsToApply.push('SHOTSPOTTER');
    }
  }

  return {
    status,
    observation_id: observationId,
    detection_score: detectionScore,
    dist_meters: distMeters,
    delta_minutes: deltaMinutes,
    tags_applied: tagsToApply,
    exif: { lat, lon, ts },
    candidates: rows,
  };
}
