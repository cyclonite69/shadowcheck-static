#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const DEFAULT_SECRET_ID = process.env.SHADOWCHECK_AWS_SECRET || 'shadowcheck/config';
const DEFAULT_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const PREFERRED_AWS_PROFILES = ['shadowcheck-sso', 'shadowcheck'];

function usage() {
  return `Usage: node scripts/backup-sm-to-bitwarden.js [options]

Back up the AWS Secrets Manager JSON blob into a Bitwarden secure note without
writing secrets to disk.

Options:
  --secret-id NAME        AWS Secrets Manager secret id (default: ${DEFAULT_SECRET_ID})
  --region REGION         AWS region (default: ${DEFAULT_REGION})
  --profile PROFILE       AWS profile override
  --item-name NAME        Bitwarden item name override
  --folder-id ID          Bitwarden folder id
  --organization-id ID    Bitwarden organization id
  --appdata-dir PATH      Override BITWARDENCLI_APPDATA_DIR for bw CLI
  --help, -h              Show this help

Environment:
  BW_SESSION              Existing unlocked Bitwarden session, if required
  BITWARDENCLI_APPDATA_DIR
                          bw CLI writable state directory

Notes:
  - The Bitwarden secure note body is the raw AWS SecretString JSON only.
  - No secret values are written to disk by this script.
  - bw CLI still needs an authenticated, unlocked vault.
`;
}

function parseArgs(argv) {
  const options = {
    secretId: DEFAULT_SECRET_ID,
    region: DEFAULT_REGION,
    profile: resolveDefaultAwsProfile(),
    itemName: '',
    folderId: '',
    organizationId: '',
    appdataDir: process.env.BITWARDENCLI_APPDATA_DIR || '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--secret-id':
        options.secretId = argv[++i] || '';
        break;
      case '--region':
        options.region = argv[++i] || '';
        break;
      case '--profile':
        options.profile = argv[++i] || '';
        break;
      case '--item-name':
        options.itemName = argv[++i] || '';
        break;
      case '--folder-id':
        options.folderId = argv[++i] || '';
        break;
      case '--organization-id':
        options.organizationId = argv[++i] || '';
        break;
      case '--appdata-dir':
        options.appdataDir = argv[++i] || '';
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.secretId) {
    throw new Error('Missing --secret-id value');
  }
  if (!options.region) {
    throw new Error('Missing --region value');
  }

  return options;
}

function hasAmbientAwsCredentials() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_SESSION_TOKEN ||
    process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
    process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ||
    process.env.AWS_PROFILE
  );
}

function readIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function configHasProfile(content, profile) {
  return content.includes(`[profile ${profile}]`) || content.includes(`[${profile}]`);
}

function detectLocalAwsProfile() {
  const awsDir = path.join(os.homedir(), '.aws');
  const configContent = readIfExists(path.join(awsDir, 'config'));
  const credentialsContent = readIfExists(path.join(awsDir, 'credentials'));

  for (const profile of PREFERRED_AWS_PROFILES) {
    if (configHasProfile(configContent, profile) || configHasProfile(credentialsContent, profile)) {
      return profile;
    }
  }

  return '';
}

function resolveDefaultAwsProfile() {
  if (process.env.AWS_PROFILE) {
    return process.env.AWS_PROFILE;
  }

  if (hasAmbientAwsCredentials()) {
    return '';
  }

  return detectLocalAwsProfile();
}

function normalizeSecretBlob(secretString) {
  let parsed;
  try {
    parsed = JSON.parse(secretString);
  } catch (error) {
    throw new Error('AWS SecretString was not valid JSON', { cause: error });
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('AWS SecretString must be a flat JSON object');
  }

  const normalized = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'undefined') {
      continue;
    }
    normalized[key] = value === null ? '' : String(value);
  }
  return normalized;
}

function buildDefaultItemName(secretId, exportedAt) {
  return `ShadowCheck AWS Secrets Backup (${secretId}) ${exportedAt}`;
}

function buildBitwardenSecureNoteItem({
  secretId,
  secretString,
  itemName,
  folderId,
  organizationId,
  exportedAt,
}) {
  const normalizedSecrets = normalizeSecretBlob(secretString);
  const timestamp = exportedAt || new Date().toISOString();

  return {
    organizationId: organizationId || null,
    folderId: folderId || null,
    type: 2,
    name: itemName || buildDefaultItemName(secretId, timestamp),
    notes: secretString,
    favorite: false,
    fields: [
      { name: 'aws_secret_id', value: secretId, type: 0 },
      { name: 'backup_exported_at', value: timestamp, type: 0 },
      { name: 'backup_key_count', value: String(Object.keys(normalizedSecrets).length), type: 0 },
    ],
    login: null,
    secureNote: { type: 0 },
    card: null,
    identity: null,
    reprompt: 0,
  };
}

function requireCommand(command) {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Required command not found or not runnable: ${command}`, { cause: error });
  }
}

function fetchAwsSecretString({ secretId, region, profile }) {
  const args = [
    'secretsmanager',
    'get-secret-value',
    '--secret-id',
    secretId,
    '--region',
    region,
    '--query',
    'SecretString',
    '--output',
    'text',
  ];

  if (profile) {
    args.push('--profile', profile);
  }

  try {
    return execFileSync('aws', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr?.toString?.() || '';
    const stdout = error?.stdout?.toString?.() || '';
    const details = `${stderr}\n${stdout}`.trim();

    if (details.includes('Unable to locate credentials')) {
      if (profile) {
        throw new Error(
          `AWS credentials were not available for profile '${profile}'. Run 'aws sso login --profile ${profile}' and retry.`,
          { cause: error }
        );
      }

      throw new Error(
        "AWS credentials were not available. This repo usually uses the 'shadowcheck-sso' profile. Run 'aws sso login --profile shadowcheck-sso' and retry with AWS_PROFILE=shadowcheck-sso or --profile shadowcheck-sso.",
        { cause: error }
      );
    }

    throw new Error(
      `Failed to read AWS Secrets Manager secret '${secretId}' in region '${region}'. ${details || 'See aws CLI output for details.'}`,
      { cause: error }
    );
  }
}

function runCommandWithInput(command, args, input, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...extraEnv },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
        reject(new Error(details || `${command} exited with code ${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

function getBitwardenStatus({ appdataDir }) {
  const env = { ...process.env };
  if (appdataDir) {
    env.BITWARDENCLI_APPDATA_DIR = appdataDir;
  }

  try {
    const raw = execFileSync('bw', ['status', '--response'], {
      encoding: 'utf8',
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return JSON.parse(raw);
  } catch (error) {
    const stderr = error?.stderr?.toString?.() || '';
    const stdout = error?.stdout?.toString?.() || '';
    const details = `${stderr}\n${stdout}`.trim();
    throw new Error(
      `Failed to read Bitwarden status. ${details || 'See bw CLI output for details.'}`,
      {
        cause: error,
      }
    );
  }
}

function assertBitwardenReady(statusResponse) {
  const status = statusResponse?.data?.template?.status || statusResponse?.data?.status;

  if (status === 'unlocked') {
    return;
  }

  if (status === 'unauthenticated') {
    throw new Error(
      "Bitwarden is not logged in. Run 'bw login' first, then 'export BW_SESSION=\"$(bw unlock --raw)\"' in the same shell and retry."
    );
  }

  if (status === 'locked') {
    throw new Error(
      'Bitwarden is locked. Run \'export BW_SESSION="$(bw unlock --raw)"\' in the same shell and retry.'
    );
  }

  throw new Error(`Bitwarden is not ready. Current status: ${status || 'unknown'}`);
}

async function createBitwardenItem(item, { appdataDir }) {
  const extraEnv = {};
  if (appdataDir) {
    extraEnv.BITWARDENCLI_APPDATA_DIR = appdataDir;
  }

  const encoded = await runCommandWithInput(
    'bw',
    ['encode'],
    `${JSON.stringify(item)}\n`,
    extraEnv
  );

  const created = await runCommandWithInput(
    'bw',
    ['--response', 'create', 'item'],
    encoded.stdout,
    extraEnv
  );

  return JSON.parse(created.stdout);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  requireCommand('aws');
  requireCommand('bw');
  assertBitwardenReady(getBitwardenStatus(options));

  const secretString = fetchAwsSecretString(options);
  const item = buildBitwardenSecureNoteItem({
    secretId: options.secretId,
    secretString,
    itemName: options.itemName,
    folderId: options.folderId,
    organizationId: options.organizationId,
  });

  const created = await createBitwardenItem(item, options);
  const itemId = created?.data?.id || created?.id || 'unknown';
  const itemName = created?.data?.name || created?.name || item.name;
  const keyCount = normalizeSecretBlob(secretString);

  process.stdout.write('Created Bitwarden backup item.\n');
  process.stdout.write(`  id: ${itemId}\n`);
  process.stdout.write(`  name: ${itemName}\n`);
  process.stdout.write(`  aws_secret_id: ${options.secretId}\n`);
  process.stdout.write(`  key_count: ${Object.keys(keyCount).length}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  assertBitwardenReady,
  buildBitwardenSecureNoteItem,
  buildDefaultItemName,
  getBitwardenStatus,
  normalizeSecretBlob,
  parseArgs,
};
