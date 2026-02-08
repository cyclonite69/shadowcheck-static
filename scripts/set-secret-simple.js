#!/usr/bin/env node
/**
 * Set Secret - Direct keyring file write (no TypeScript dependencies)
 * Usage: node scripts/set-secret-simple.js <secret_name> <value>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const MACHINE_ID_FILE = path.join(os.homedir(), '.shadowcheck-machine-id');
const KEYRING_FILE = path.join(os.homedir(), '.local/share/shadowcheck/keyring.enc');
const DATA_DIR = path.dirname(KEYRING_FILE);

function encrypt(data, machineId) {
  const key = crypto.scryptSync(machineId, 'shadowcheck-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);

  return `${iv.toString('hex')}:${combined.toString('hex')}`;
}

function decrypt(encryptedData, machineId) {
  const key = crypto.scryptSync(machineId, 'shadowcheck-salt', 32);
  const [ivHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encBuffer = Buffer.from(encryptedHex, 'hex');

  const authTag = encBuffer.slice(-16);
  const ciphertext = encBuffer.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

const secretName = process.argv[2];
const secretValue = process.argv[3];

if (!secretName || !secretValue) {
  console.error('Usage: node scripts/set-secret-simple.js <secret_name> <value>');
  process.exit(1);
}

try {
  const machineId = fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim();

  // Load existing secrets
  let secrets = {};
  if (fs.existsSync(KEYRING_FILE)) {
    const encryptedData = fs.readFileSync(KEYRING_FILE, 'utf8');
    secrets = decrypt(encryptedData, machineId);
  }

  // Update secret
  secrets[secretName] = secretValue;

  // Save
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }

  const encrypted = encrypt(secrets, machineId);
  fs.writeFileSync(KEYRING_FILE, encrypted, { mode: 0o600 });

  console.log(`✅ Secret '${secretName}' stored in keyring`);
  process.exit(0);
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}
