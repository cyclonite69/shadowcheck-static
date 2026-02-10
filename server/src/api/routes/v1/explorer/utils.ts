const { query } = require('../../../config/database');
const logger = require('../../../logging/logger');
const { validateBSSID, validateIntegerRange } = require('../../../validation/schemas');
const {
  UniversalFilterQueryBuilder,
  validateFilterPayload,
} = require('../../../services/filterQueryBuilder');

const parseJsonParam = (value, fallback, name) => {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON for ${name}`);
  }
};

const assertHomeExistsIfNeeded = async (enabled, res) => {
  if (!enabled?.distanceFromHomeMin && !enabled?.distanceFromHomeMax) {
    return true;
  }
  try {
    const home = await query(
      "SELECT 1 FROM app.location_markers WHERE marker_type = 'home' LIMIT 1"
    );
    if (home.rowCount === 0) {
      res.status(400).json({
        ok: false,
        error: 'Home location is required for distance filters.',
      });
      return false;
    }
    return true;
  } catch (err) {
    if (err && err.code === '42P01') {
      res.status(400).json({
        ok: false,
        error: 'Home location markers table is missing (app.location_markers).',
      });
      return false;
    }
    throw err;
  }
};

function inferSecurity(capabilities, encryption) {
  const cap = String(capabilities || encryption || '').toUpperCase();
  if (!cap) {
    return 'OPEN';
  }
  const hasEap = cap.includes('EAP') || cap.includes('MGT');
  if (cap.includes('WPA3') || cap.includes('SAE')) {
    return hasEap ? 'WPA3-E' : 'WPA3-P';
  }
  if (cap.includes('WPA2') || cap.includes('RSN')) {
    return hasEap ? 'WPA2-E' : 'WPA2-P';
  }
  if (cap.includes('WPA')) {
    return 'WPA';
  }
  if (cap.includes('WEP')) {
    return 'WEP';
  }
  if (cap.includes('WPS') && !cap.includes('WPA')) {
    return 'WPS';
  }
  return 'Unknown';
}

// WiGLE Network Type Classifications (https://api.wigle.net/csvFormat.html)
// W = WiFi, B = Bluetooth, E = BLE, G = GSM, C = CDMA, D = WCDMA, L = LTE, N = NR (5G), F = NFC
function inferRadioType(radioType, ssid, frequency, capabilities) {
  // If database has a valid radio_type, use it
  if (radioType && radioType !== '' && radioType !== null) {
    return radioType;
  }

  const ssidUpper = String(ssid || '').toUpperCase();
  const capUpper = String(capabilities || '').toUpperCase();

  // Check for 5G NR (New Radio)
  if (ssidUpper.includes('5G') || capUpper.includes('NR') || capUpper.includes('5G NR')) {
    return 'N';
  }

  // Check for LTE (4G)
  if (
    ssidUpper.includes('LTE') ||
    ssidUpper.includes('4G') ||
    capUpper.includes('LTE') ||
    capUpper.includes('EARFCN')
  ) {
    return 'L';
  }

  // Check for WCDMA (3G)
  if (
    ssidUpper.includes('WCDMA') ||
    ssidUpper.includes('3G') ||
    ssidUpper.includes('UMTS') ||
    capUpper.includes('WCDMA') ||
    capUpper.includes('UMTS') ||
    capUpper.includes('UARFCN')
  ) {
    return 'D';
  }

  // Check for GSM (2G)
  if (
    ssidUpper.includes('GSM') ||
    ssidUpper.includes('2G') ||
    capUpper.includes('GSM') ||
    capUpper.includes('ARFCN')
  ) {
    return 'G';
  }

  // Check for CDMA
  if (ssidUpper.includes('CDMA') || capUpper.includes('CDMA')) {
    return 'C';
  }

  // Check for generic cellular keywords
  const cellularKeywords = ['T-MOBILE', 'VERIZON', 'AT&T', 'ATT', 'SPRINT', 'CARRIER', '3GPP'];
  if (cellularKeywords.some((keyword) => ssidUpper.includes(keyword))) {
    return 'L'; // Default cellular to LTE
  }

  // Check for BLE (Bluetooth Low Energy)
  if (
    ssidUpper.includes('[UNKNOWN / SPOOFED RADIO]') ||
    ssidUpper.includes('BLE') ||
    ssidUpper.includes('BTLE') ||
    capUpper.includes('BLE') ||
    capUpper.includes('BTLE') ||
    capUpper.includes('BLUETOOTH LOW ENERGY')
  ) {
    return 'E';
  }

  // Check for Bluetooth Classic
  if (ssidUpper.includes('BLUETOOTH') || capUpper.includes('BLUETOOTH')) {
    if (!capUpper.includes('LOW ENERGY') && !capUpper.includes('BLE')) {
      return 'B';
    }
    return 'E'; // Default Bluetooth to BLE if ambiguous
  }

  // Check frequency ranges
  if (frequency) {
    const freq = parseInt(frequency, 10);

    // WiFi 2.4GHz band (2400-2500 MHz)
    if (freq >= 2412 && freq <= 2484) {
      return 'W';
    }

    // WiFi 5GHz band (5000-6000 MHz)
    if (freq >= 5000 && freq <= 5900) {
      return 'W';
    }

    // WiFi 6GHz band (5925-7125 MHz)
    if (freq >= 5925 && freq <= 7125) {
      return 'W';
    }

    // Bluetooth/BLE (2400-2483.5 MHz, overlaps with WiFi 2.4GHz)
    // This is less reliable, only use if no other indicators
  }

  // Check capabilities for WiFi keywords
  if (
    capUpper.includes('WPA') ||
    capUpper.includes('WEP') ||
    capUpper.includes('WPS') ||
    capUpper.includes('RSN') ||
    capUpper.includes('ESS') ||
    capUpper.includes('CCMP') ||
    capUpper.includes('TKIP')
  ) {
    return 'W';
  }

  // Unknown - don't default to WiFi
  return '?';
}

/**
 * Parses an optional string query parameter with length limits.
 * @param {any} value - Raw parameter value
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Field name for error messages
 * @returns {{ ok: boolean, value?: string }}
 */
function parseOptionalString(value, maxLength, fieldName) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: '' };
  }

  const normalized = String(value).trim();
  if (normalized.length > maxLength) {
    logger.warn(`Trimming ${fieldName} to ${maxLength} characters`);
    return { ok: true, value: normalized.slice(0, maxLength) };
  }

  return { ok: true, value: normalized };
}

/**
 * Parses limit parameter that can be numeric or the string "all".
 * @param {any} value - Raw limit parameter
 * @param {number} defaultValue - Default limit when missing
 * @param {number} maxValue - Maximum allowed limit
 * @returns {{ ok: boolean, value?: number|null }}
 */
function parseLimit(value, defaultValue, maxValue) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: defaultValue };
  }

  if (typeof value === 'string' && value.toLowerCase() === 'all') {
    return { ok: true, value: null };
  }

  const validation = validateIntegerRange(value, 1, maxValue, 'limit');
  if (!validation.valid) {
    return { ok: true, value: defaultValue };
  }

  return { ok: true, value: validation.value };
}

/**
 * Parses pagination page parameter.
 * @param {any} value - Raw page parameter
 * @param {number} defaultValue - Default page
 * @param {number} maxValue - Maximum allowed page
 * @returns {{ ok: boolean, value?: number }}
 */
function parsePage(value, defaultValue, maxValue) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: defaultValue };
  }

  const validation = validateIntegerRange(value, 1, maxValue, 'page');
  if (!validation.valid) {
    return { ok: true, value: defaultValue };
  }

  return { ok: true, value: validation.value };
}

/**
 * Parses offset parameter.
 * @param {any} value - Raw offset parameter
 * @param {number} defaultValue - Default offset
 * @param {number} maxValue - Maximum allowed offset
 * @returns {{ ok: boolean, value?: number }}
 */
function parseOffset(value, defaultValue, maxValue) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: defaultValue };
  }

  const validation = validateIntegerRange(value, 0, maxValue, 'offset');
  if (!validation.valid) {
    return { ok: true, value: defaultValue };
  }

  return { ok: true, value: validation.value };
}

/**
 * Normalizes quality filter values.
 * @param {any} value - Raw quality filter value
 * @returns {string} Normalized quality filter value
 */
function normalizeQualityFilter(value) {
  const normalized = String(value || 'none')
    .trim()
    .toLowerCase();
  const allowed = ['none', 'temporal', 'extreme', 'duplicate', 'all'];
  return allowed.includes(normalized) ? normalized : 'none';
}

// GET /api/explorer/networks
// Returns latest snapshot per BSSID from access_points + observations

export {
  parseJsonParam,
  assertHomeExistsIfNeeded,
  inferSecurity,
  inferRadioType,
  parseOptionalString,
  parseLimit,
  parsePage,
  parseOffset,
  normalizeQualityFilter,
};
