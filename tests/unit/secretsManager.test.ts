// Mock dependencies before requiring secretsManager
jest.mock('../../server/src/services/keyringService', () => ({
  getCredential: jest.fn(),
}));

describe('SecretsManager', () => {
  let secretsManager: any;
  let keyringService: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment variables
    delete process.env.DB_PASSWORD;
    delete process.env.MAPBOX_TOKEN;
    delete process.env.API_KEY;
    delete process.env.NODE_ENV;

    // Clear module cache to get fresh instance
    jest.resetModules();
    jest.clearAllMocks();

    // Require fresh instances
    keyringService = require('../../server/src/services/keyringService');
    secretsManager = require('../../server/src/services/secretsManager');

    // Clear state
    secretsManager.secrets.clear();
    secretsManager.sources.clear();
    secretsManager.accessLog = [];
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Tier 3: Environment Variables', () => {
    test('should load secrets from environment variables', async () => {
      process.env.DB_PASSWORD = 'env_password';
      process.env.MAPBOX_TOKEN = 'pk.env_token';

      keyringService.getCredential.mockResolvedValue(null);

      await secretsManager.load();

      expect(secretsManager.get('db_password')).toBe('env_password');
      expect(secretsManager.get('mapbox_token')).toBe('pk.env_token');
      expect(secretsManager.getSource('db_password')).toBe('env');
      expect(secretsManager.getSource('mapbox_token')).toBe('env');
    });

    test('should warn when using env vars in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_PASSWORD = 'env_password';
      process.env.MAPBOX_TOKEN = 'pk.env_token';

      keyringService.getCredential.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await secretsManager.load();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('loaded from env vars in production')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Tier 2: Keyring', () => {
    test('should load secrets from keyring', async () => {
      keyringService.getCredential.mockImplementation((name: string) => {
        if (name === 'db_password') {return Promise.resolve('keyring_password');}
        if (name === 'mapbox_token') {return Promise.resolve('pk.keyring_token');}
        return Promise.resolve(null);
      });

      await secretsManager.load();

      expect(secretsManager.get('db_password')).toBe('keyring_password');
      expect(secretsManager.get('mapbox_token')).toBe('pk.keyring_token');
      expect(secretsManager.getSource('db_password')).toBe('keyring');
      expect(secretsManager.getSource('mapbox_token')).toBe('keyring');
    });

    test('should prefer keyring over environment variables', async () => {
      process.env.DB_PASSWORD = 'env_password';
      process.env.MAPBOX_TOKEN = 'pk.env_token';
      keyringService.getCredential.mockImplementation((name: string) => {
        if (name === 'db_password') {return Promise.resolve('keyring_password');}
        if (name === 'mapbox_token') {return Promise.resolve('pk.keyring_token');}
        return Promise.resolve(null);
      });

      await secretsManager.load();

      expect(secretsManager.get('db_password')).toBe('keyring_password');
      expect(secretsManager.getSource('db_password')).toBe('keyring');
    });
  });

  describe('Required Secrets Validation', () => {
    test('should throw error if required secret is missing', async () => {
      keyringService.getCredential.mockResolvedValue(null);

      await expect(secretsManager.load()).rejects.toThrow(
        /Required secret 'db_password' not found/
      );
    });

    test('should provide helpful error message with all sources tried', async () => {
      keyringService.getCredential.mockResolvedValue(null);

      await expect(secretsManager.load()).rejects.toThrow(
        /Keyring.*local secrets.*Environment/
      );
    });

    test('should include hint in error message', async () => {
      keyringService.getCredential.mockResolvedValue(null);

      await expect(secretsManager.load()).rejects.toThrow(
        /Hint:.*set-secret\.ts/
      );
    });
  });

  describe('Optional Secrets', () => {
    test('should not throw if optional secret is missing', async () => {
      process.env.DB_PASSWORD = 'password';
      process.env.MAPBOX_TOKEN = 'pk.token';
      keyringService.getCredential.mockResolvedValue(null);

      await expect(secretsManager.load()).resolves.not.toThrow();

      expect(secretsManager.get('api_key')).toBeNull();
      expect(secretsManager.get('wigle_api_key')).toBeNull();
    });

    test('should log warning for missing optional secrets', async () => {
      process.env.DB_PASSWORD = 'password';
      process.env.MAPBOX_TOKEN = 'pk.token';
      keyringService.getCredential.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await secretsManager.load();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('api_key not found (optional)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Secret Validation', () => {
    test('should warn if Mapbox token does not start with pk.', async () => {
      process.env.DB_PASSWORD = 'password';
      process.env.MAPBOX_TOKEN = 'sk.secret_token';
      keyringService.getCredential.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await secretsManager.load();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MAPBOX_TOKEN should start with "pk."')
      );

      consoleSpy.mockRestore();
    });

    test('should not warn if Mapbox token starts with pk.', async () => {
      process.env.DB_PASSWORD = 'password';
      process.env.MAPBOX_TOKEN = 'pk.public_token';
      keyringService.getCredential.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await secretsManager.load();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('MAPBOX_TOKEN should start with "pk."')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('API Methods', () => {
    beforeEach(async () => {
      process.env.DB_PASSWORD = 'password';
      process.env.MAPBOX_TOKEN = 'pk.token';
      process.env.API_KEY = 'api_key';
      keyringService.getCredential.mockResolvedValue(null);
      await secretsManager.load();
    });

    test('get() should return secret value', () => {
      expect(secretsManager.get('db_password')).toBe('password');
      expect(secretsManager.get('mapbox_token')).toBe('pk.token');
    });

    test('get() should return null for missing secret', () => {
      expect(secretsManager.get('nonexistent')).toBeNull();
    });

    test('getOrThrow() should return secret value', () => {
      expect(secretsManager.getOrThrow('db_password')).toBe('password');
    });

    test('getOrThrow() should throw for missing secret', () => {
      expect(() => secretsManager.getOrThrow('nonexistent')).toThrow(
        /Secret 'nonexistent' is required but not available/
      );
    });

    test('has() should return true for existing secret', () => {
      expect(secretsManager.has('db_password')).toBe(true);
      expect(secretsManager.has('mapbox_token')).toBe(true);
    });

    test('has() should return false for missing secret', () => {
      expect(secretsManager.has('nonexistent')).toBe(false);
    });

    test('getSource() should return secret source', () => {
      expect(secretsManager.getSource('db_password')).toBe('env');
      expect(secretsManager.getSource('mapbox_token')).toBe('env');
    });

    test('getSource() should return undefined for missing secret', () => {
      expect(secretsManager.getSource('nonexistent')).toBeUndefined();
    });
  });

  describe('Access Logging', () => {
    beforeEach(async () => {
      process.env.DB_PASSWORD = 'password';
      process.env.MAPBOX_TOKEN = 'pk.token';
      keyringService.getCredential.mockResolvedValue(null);
      await secretsManager.load();
    });

    test('should log access to existing secrets', () => {
      secretsManager.get('db_password');
      secretsManager.get('mapbox_token');

      const log = secretsManager.getAccessLog();

      expect(log).toHaveLength(2);
      expect(log[0]).toMatchObject({
        secret: 'db_password',
        found: true,
      });
      expect(log[1]).toMatchObject({
        secret: 'mapbox_token',
        found: true,
      });
    });

    test('should log access to missing secrets', () => {
      secretsManager.get('nonexistent');

      const log = secretsManager.getAccessLog();

      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        secret: 'nonexistent',
        found: false,
      });
    });

    test('should include timestamp in access log', () => {
      secretsManager.get('db_password');

      const log = secretsManager.getAccessLog();

      expect(log[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should not log secret values', () => {
      secretsManager.get('api_key');

      const log = secretsManager.getAccessLog();
      const logString = JSON.stringify(log);

      // Should not contain the actual secret value
      expect(logString).not.toContain('api_key_value');
      expect(logString).toContain('api_key'); // But should contain the secret name
    });
  });
});
