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
  const [ivHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encBuffer = Buffer.from(encryptedHex, 'hex');

  // Extract auth tag (last 16 bytes)
  const authTag = encBuffer.slice(-16);
  const ciphertext = encBuffer.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
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
