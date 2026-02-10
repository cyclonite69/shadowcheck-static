/**
 * WiGLE validation middleware
 */

const { validateQuery, optional } = require('../../../../validation/middleware');
const { validateIntegerRange, validateString } = require('../../../../validation/schemas');

/**
 * Validates WiGLE search query parameters.
 */
export const validateWigleSearchQuery = validateQuery({
  ssid: optional((value: any) => validateString(String(value), 1, 64, 'ssid')),
  bssid: optional((value: any) => validateString(String(value), 1, 64, 'bssid')),
  limit: optional((value: any) => validateIntegerRange(value, 1, Number.MAX_SAFE_INTEGER, 'limit')),
});

/**
 * Validates WiGLE networks query parameters.
 */
export const validateWigleNetworksQuery = validateQuery({
  limit: optional((value: any) => validateIntegerRange(value, 1, Number.MAX_SAFE_INTEGER, 'limit')),
  offset: optional((value: any) => validateIntegerRange(value, 0, 10000000, 'offset')),
  type: optional((value: any) => validateString(String(value), 1, 16, 'type')),
});
