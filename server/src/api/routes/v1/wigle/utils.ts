/**
 * WiGLE utility functions
 */

/**
 * Parses and validates include_total query flag.
 * @param {any} value - Raw include_total query value
 * @returns {{ valid: boolean, value?: boolean, error?: string }}
 */
export function parseIncludeTotalFlag(value: any) {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: false };
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') {
    return { valid: true, value: true };
  }
  if (normalized === '0' || normalized === 'false') {
    return { valid: true, value: false };
  }

  return { valid: false, error: 'include_total must be 1, 0, true, or false' };
}

/**
 * Strip null bytes from string value
 */
export const stripNullBytes = (value: any): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const cleaned = String(value).replace(/\u0000/g, '');
  return cleaned === '' ? null : cleaned;
};

/**
 * Strip null bytes but keep empty strings
 */
export const stripNullBytesKeepEmpty = (value: any): any => {
  if (value === undefined || value === null) {
    return value;
  }
  return String(value).replace(/\u0000/g, '');
};

/**
 * Strip null bytes recursively from objects/arrays
 */
export const stripNullBytesDeep = (value: any): any => {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value === 'string') {
    return stripNullBytesKeepEmpty(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripNullBytesDeep(item));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, stripNullBytesDeep(val)])
    );
  }
  return value;
};
