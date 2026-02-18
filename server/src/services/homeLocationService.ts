/**
 * Home Location Service Layer
 * Encapsulates database queries for home location operations
 */

const { query } = require('../config/database');

export async function getCurrentHomeLocation(): Promise<any | null> {
  const result = await query(`
    SELECT 
      latitude,
      longitude,
      radius,
      created_at
    FROM app.location_markers
    WHERE marker_type = 'home'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

module.exports = {
  getCurrentHomeLocation,
};
