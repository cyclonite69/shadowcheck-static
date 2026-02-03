/**
 * Safe JSON Parser Utility
 * Handles malformed Unicode escape sequences gracefully
 */

/**
 * Safe JSON parser that handles malformed Unicode escape sequences
 * @param jsonString - The JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
function safeJsonParse(jsonString: unknown): any | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  const trimmed = jsonString.trim();
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error: any) {
    // Handle Unicode escape sequence errors
    if (
      error.message?.includes('Unicode escape sequence') ||
      error.message?.includes('escape sequence')
    ) {
      console.warn(`Unicode escape error in JSON: ${error.message}`);
      console.warn(`Problematic JSON string: ${trimmed.substring(0, 100)}...`);

      try {
        // Attempt to fix common Unicode escape issues
        const fixed = trimmed
          .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u') // Fix incomplete \u sequences
          .replace(/\\(?!["\\/bfnrtu])/g, '\\\\'); // Escape unescaped backslashes

        return JSON.parse(fixed);
      } catch (secondError: any) {
        console.error(`Failed to fix JSON: ${secondError.message}`);
        return null;
      }
    }

    console.error(`JSON parse error: ${error.message}`);
    return null;
  }
}

export { safeJsonParse };
