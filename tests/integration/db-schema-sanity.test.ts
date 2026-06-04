/**
 * DB Schema Sanity Test
 * Ensures that no duplicate index definitions exist in the active schema.
 */

export {};

const { runIntegration } = require('../helpers/integrationEnv');
const { pool } = require('../../server/src/config/database');

const describeIfIntegration = runIntegration ? describe : describe.skip;

describeIfIntegration('DB Schema Sanity Checks', () => {
  test('should not contain any duplicate or identical index structures in the app schema', async () => {
    const query = `
      SELECT 
        indrelid::regclass::text AS table_name,
        array_to_string(array_agg(pg_index.indexrelid::regclass::text), ', ') as duplicate_indexes
      FROM pg_index
      JOIN pg_stat_user_indexes ON pg_stat_user_indexes.indexrelid = pg_index.indexrelid
      WHERE schemaname = 'app'
      GROUP BY 
        indrelid, 
        indkey::text, 
        indclass::text, 
        indoption::text, 
        indisunique, 
        indisprimary, 
        indisreplident, 
        indpred::text,
        coalesce(pg_get_expr(indexprs, indrelid)::text, '')
      HAVING count(*) > 1;
    `;

    const res = await pool.query(query);
    const realDuplicates = res.rows;

    if (realDuplicates.length > 0) {
      console.error('FAIL: Duplicate indexes found in app schema:', realDuplicates);
    }

    expect(realDuplicates.length).toBe(0);
  });
});
