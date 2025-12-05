// Direct database connection test
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  // TRY 1: Direct localhost bypass
  const client = new Client({
    user: process.env.DB_USER,
    host: '127.0.0.1', // Force numeric IP, no DNS
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432, // Force numeric port
    connectionTimeoutMillis: 10000,
    query_timeout: 5000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });

  try {
    console.log('Attempting connection...');
    console.log('Config:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    await client.connect();
    console.log('✓ Connected successfully!');

    const result = await client.query('SELECT NOW(), version()');
    console.log('✓ Query result:', result.rows[0]);

    await client.end();
    console.log('✓ Test passed!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Connection failed:', err.message);
    console.error('✗ Error code:', err.code);
    console.error('✗ Full error:', err);
    process.exit(1);
  }
}

testConnection();
