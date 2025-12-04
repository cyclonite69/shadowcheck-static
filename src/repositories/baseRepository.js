/**
 * Base repository class
 * Provides common database operations
 */

const { query } = require('../config/database');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    return query(text, params);
  }

  /**
   * Get a single row by condition
   * @param {string} whereClause - WHERE clause (e.g., "id = $1")
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row or null
   */
  async findOne(whereClause, params = []) {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Get multiple rows by condition
   * @param {string} whereClause - WHERE clause
   * @param {Array} params - Query parameters
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Array of rows
   */
  async findMany(whereClause = '1=1', params = [], options = {}) {
    const { limit = 100, offset = 0, orderBy = 'id DESC' } = options;
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * Count rows by condition
   * @param {string} whereClause - WHERE clause
   * @param {Array} params - Query parameters
   * @returns {Promise<number>} Count of rows
   */
  async count(whereClause = '1=1', params = []) {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.query(sql, params);
    return parseInt(result.rows[0]?.count || 0);
  }

  /**
   * Insert a new row
   * @param {Object} data - Column-value pairs
   * @returns {Promise<Object>} Inserted row
   */
  async insert(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * Update rows by condition
   * @param {Object} data - Column-value pairs to update
   * @param {string} whereClause - WHERE clause
   * @param {Array} whereParams - WHERE parameters
   * @returns {Promise<number>} Number of updated rows
   */
  async update(data, whereClause, whereParams = []) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const whereParamsOffset = values.length;
    const adjustedWhereParams = whereParams.map((_, i) => `$${whereParamsOffset + i + 1}`);

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await this.query(sql, [...values, ...whereParams]);
    return result.rows;
  }

  /**
   * Delete rows by condition
   * @param {string} whereClause - WHERE clause
   * @param {Array} params - Query parameters
   * @returns {Promise<number>} Number of deleted rows
   */
  async delete(whereClause, params = []) {
    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.query(sql, params);
    return result.rowCount;
  }
}

module.exports = BaseRepository;
