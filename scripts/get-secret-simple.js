#!/usr/bin/env node
/**
 * Get Secret - Direct keyring file read (no TypeScript dependencies)
 * Usage: node scripts/get-secret-simple.js <secret_name>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const MACHINE_ID_FILE = path.join(os.homedir(), '.shadowcheck-machine-id');
const KEYRING_FILE = path.join(os.homedir(), '.local/share/shadowcheck/keyring.enc');

function decrypt(encryptedData, machineId) {
  const key = crypto.scryptSync(machineId, 'shadowcheck-salt', 32);
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString());
}

const secretName = process.argv[2];

if (!secretName) {
  console.error('Usage: node scripts/get-secret-simple.js <secret_name>');
  process.exit(1);
}

try {
  const machineId = fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim();
  const encryptedData = fs.readFileSync(KEYRING_FILE, 'utf8');
  const secrets = decrypt(encryptedData, machineId);

  if (secrets[secretName]) {
    process.stdout.write(secrets[secretName]);
    process.exit(0);
  } else {
    console.error(`Secret '${secretName}' not found`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}
