const { Client } = require('pg');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_NAME = process.env.DB_NAME || 'shadowcheck_test';
  process.env.DB_USER = process.env.DB_USER || 'shadowcheck_user';

  // Defensive password fallback: DB_PASSWORD → DB_ADMIN_PASSWORD → test_password
  if (!process.env.DB_PASSWORD && !process.env.DB_ADMIN_PASSWORD) {
    process.env.DB_PASSWORD = 'test_password';
  } else if (!process.env.DB_PASSWORD && process.env.DB_ADMIN_PASSWORD) {
    process.env.DB_PASSWORD = process.env.DB_ADMIN_PASSWORD;
  }

  if (!process.env.DB_ADMIN_PASSWORD) {
    process.env.DB_ADMIN_PASSWORD = process.env.DB_PASSWORD;
  }

  const expectedDbName = 'shadowcheck_test';
  if (process.env.DB_NAME !== expectedDbName) {
    throw new Error(
      `Refusing to run tests against '${process.env.DB_NAME}'. Set DB_NAME=${expectedDbName}.`
    );
  }

  // Validate password is a string before creating client
  if (typeof process.env.DB_PASSWORD !== 'string' || !process.env.DB_PASSWORD) {
    throw new Error(
      `DB_PASSWORD must be a non-empty string. Got: ${typeof process.env.DB_PASSWORD}`
    );
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT current_database() AS db');
    const connectedDb = result.rows?.[0]?.db;

    if (connectedDb !== expectedDbName) {
      throw new Error(
        `Connected to unexpected database '${connectedDb}'. Expected '${expectedDbName}'.`
      );
    }
  } finally {
    await client.end();
  }
};
