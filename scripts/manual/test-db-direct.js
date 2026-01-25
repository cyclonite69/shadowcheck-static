const { Pool } = require('pg');

const pool = new Pool({
  user: 'shadowcheck_user',
  password: 'PjUKZCNXUaRd9HCLjv@yj0wSSvU9hoDO',
  host: '127.0.0.1',
  port: 5432,
  database: 'shadowcheck_db',
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('Pool event: connect');
});

pool.on('acquire', () => {
  console.log('Pool event: acquire');
});

pool.on('error', (err) => {
  console.log('Pool event: error', err.message);
});

async function test() {
  console.log('Connecting to PostgreSQL...');
  try {
    const client = await pool.connect();
    console.log('Connected!');

    const result = await client.query('SELECT COUNT(*) FROM app.networks');
    console.log('Query result:', result.rows[0]);

    client.release();
    await pool.end();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

test();
