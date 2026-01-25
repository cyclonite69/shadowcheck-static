const { Client } = require('pg');

const client = new Client({
  user: 'shadowcheck_user',
  password: 'PjUKZCNXUaRd9HCLjv@yj0wSSvU9hoDO',
  host: '127.0.0.1',
  port: 5432,
  database: 'shadowcheck_db',
  connectionTimeoutMillis: 5000,
});

console.log('[1] Starting connection test...');

client.connect((err) => {
  if (err) {
    console.error('[2] Connection failed:', err.message);
    console.error('    Code:', err.code);
    console.error('    Detail:', err);
    process.exit(1);
  }

  console.log('[2] Connected! Running query...');

  client.query('SELECT 1 as result', (err, res) => {
    if (err) {
      console.error('[3] Query failed:', err.message);
      process.exit(1);
    }

    console.log('[3] Query result:', res.rows[0]);
    client.end();
    console.log('[4] Done!');
  });
});
