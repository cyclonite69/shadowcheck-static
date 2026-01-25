/**
 * SQL Escape Utilities
 * Provides functions to safely escape user input for SQL queries
 */

/**
 * Escape special characters in LIKE patterns
 *
 * Escapes % and _ characters that have special meaning in SQL LIKE clauses.
 * This prevents user input from being interpreted as wildcards.
 *
 * @param {string} input - User input to escape
 * @returns {string} Escaped string safe for LIKE patterns
 *
 * @example
 * escapeLikePattern('test%')      // Returns: 'test\\%'
 * escapeLikePattern('a_b%c')      // Returns: 'a\\_b\\%c'
 * escapeLikePattern('Starbucks')  // Returns: 'Starbucks'
 * escapeLikePattern('Café WiFi')  // Returns: 'Café WiFi'
 * escapeLikePattern('')           // Returns: ''
 * escapeLikePattern(null)         // Returns: ''
 *
 * @example
 * // Usage in LIKE query
 * const userInput = 'test%';
 * const escaped = escapeLikePattern(userInput);
 * const pattern = `%${escaped}%`;
 * // Query: WHERE ssid ILIKE $1 with parameter: '%test\\%%'
 */
function escapeLikePattern(input) {
  // Handle null, undefined, or non-string input
  if (input === null || typeof input !== 'string') {
    return '';
  }

  // Escape backslash first (to avoid double-escaping), then % and _
  return input
    .replace(/\\/g, '\\\\') // Backslash → \\
    .replace(/%/g, '\\%') // Percent → \%
    .replace(/_/g, '\\_'); // Underscore → \_
}

module.exports = {
  escapeLikePattern,
};
