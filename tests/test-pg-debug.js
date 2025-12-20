const { Client } = require('pg');

// Enable debug logging
const client = new Client({
  user: 'shadowcheck_user',
  password: 'PjUKZCNXUaRd9HCLjv@yj0wSSvU9hoDO',
  host: '127.0.0.1',
  port: 5432,
  database: 'shadowcheck_db',
  connectionTimeoutMillis: 10000,
});

console.log('Creating client with config:', {
  host: '127.0.0.1',
  port: 5432,
  user: 'shadowcheck_user',
  database: 'shadowcheck_db',
});

client.on('error', (err) => {
  console.error('Client error event:', err.message);
});

client.on('end', () => {
  console.log('Client connection ended');
});

async function test() {
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✓ Connected successfully!');

    const result = await client.query('SELECT NOW(), version()');
    console.log('✓ Query successful:', result.rows[0]);

    await client.end();
    console.log('✓ Connection closed cleanly');
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error('Error code:', err.code);
    console.error('Error syscall:', err.syscall);
    console.error('Error errno:', err.errno);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

test();
