const {
  assertBitwardenReady,
  buildBitwardenSecureNoteItem,
  buildDefaultItemName,
  normalizeSecretBlob,
  parseArgs,
} = require('../../scripts/backup-sm-to-bitwarden.js');

describe('backup-secrets-to-bitwarden', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SESSION_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('normalizeSecretBlob', () => {
    it('normalizes secret values into string values', () => {
      const result = normalizeSecretBlob(
        JSON.stringify({
          db_password: 'abc123',
          retries: 3,
          enabled: true,
          nullable: null,
        })
      );

      expect(result).toEqual({
        db_password: 'abc123',
        retries: '3',
        enabled: 'true',
        nullable: '',
      });
    });

    it('rejects non-object secret payloads', () => {
      expect(() => normalizeSecretBlob('["x"]')).toThrow('AWS SecretString must be a flat JSON object');
      expect(() => normalizeSecretBlob('not-json')).toThrow('AWS SecretString was not valid JSON');
    });
  });

  describe('buildDefaultItemName', () => {
    it('includes secret id and export timestamp', () => {
      expect(buildDefaultItemName('shadowcheck/config', '2026-04-17T12:00:00.000Z')).toBe(
        'ShadowCheck AWS Secrets Backup (shadowcheck/config) 2026-04-17T12:00:00.000Z'
      );
    });
  });

  describe('buildBitwardenSecureNoteItem', () => {
    it('builds a secure note whose notes body is the raw AWS secret json', () => {
      const secretString = JSON.stringify({
        db_password: 'p@ss',
        mapbox_token: 'pk.test',
      });

      const item = buildBitwardenSecureNoteItem({
        secretId: 'shadowcheck/config',
        secretString,
        folderId: 'folder-123',
        organizationId: 'org-456',
        exportedAt: '2026-04-17T12:00:00.000Z',
      });

      expect(item).toMatchObject({
        organizationId: 'org-456',
        folderId: 'folder-123',
        type: 2,
        name: 'ShadowCheck AWS Secrets Backup (shadowcheck/config) 2026-04-17T12:00:00.000Z',
        notes: secretString,
        favorite: false,
        login: null,
        secureNote: { type: 0 },
        card: null,
        identity: null,
        reprompt: 0,
      });
      expect(item.fields).toEqual([
        { name: 'aws_secret_id', value: 'shadowcheck/config', type: 0 },
        { name: 'backup_exported_at', value: '2026-04-17T12:00:00.000Z', type: 0 },
        { name: 'backup_key_count', value: '2', type: 0 },
      ]);
    });

    it('honors an explicit item name override', () => {
      const item = buildBitwardenSecureNoteItem({
        secretId: 'shadowcheck/config',
        secretString: JSON.stringify({ db_password: 'p@ss' }),
        itemName: 'Manual backup',
        exportedAt: '2026-04-17T12:00:00.000Z',
      });

      expect(item.name).toBe('Manual backup');
    });
  });

  describe('parseArgs', () => {
    it('parses explicit overrides', () => {
      const result = parseArgs([
        '--secret-id',
        'custom/secret',
        '--region',
        'us-west-2',
        '--profile',
        'prod',
        '--item-name',
        'backup item',
        '--folder-id',
        'folder-1',
        '--organization-id',
        'org-1',
        '--appdata-dir',
        '/tmp/bwcli',
      ]);

      expect(result).toMatchObject({
        secretId: 'custom/secret',
        region: 'us-west-2',
        profile: 'prod',
        itemName: 'backup item',
        folderId: 'folder-1',
        organizationId: 'org-1',
        appdataDir: '/tmp/bwcli',
      });
    });

    it('uses AWS_PROFILE when present', () => {
      process.env.AWS_PROFILE = 'shadowcheck-sso';

      const reparsed = require('../../scripts/backup-sm-to-bitwarden.js').parseArgs([]);
      expect(reparsed.profile).toBe('shadowcheck-sso');
    });

    it('rejects unknown arguments', () => {
      expect(() => parseArgs(['--bogus'])).toThrow('Unknown argument: --bogus');
    });
  });

  describe('assertBitwardenReady', () => {
    it('accepts unlocked status', () => {
      expect(() =>
        assertBitwardenReady({
          data: { status: 'unlocked' },
        })
      ).not.toThrow();
    });

    it('rejects unauthenticated status with login guidance', () => {
      expect(() =>
        assertBitwardenReady({
          data: { status: 'unauthenticated' },
        })
      ).toThrow("Bitwarden is not logged in. Run 'bw login' first");
    });

    it('rejects locked status with unlock guidance', () => {
      expect(() =>
        assertBitwardenReady({
          data: { status: 'locked' },
        })
      ).toThrow("Bitwarden is locked. Run 'export BW_SESSION=\"$(bw unlock --raw)\"'");
    });
  });
});
