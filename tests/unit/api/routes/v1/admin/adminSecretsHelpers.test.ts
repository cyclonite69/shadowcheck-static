const { listSecretsStatus, storeSecret, deleteSecret } = require('../../../../../../server/src/api/routes/v1/admin/adminSecretsHelpers');

describe('adminSecretsHelpers', () => {
  let mockSecretsManager: any;

  beforeEach(() => {
    mockSecretsManager = {
      has: jest.fn(),
      putSecret: jest.fn(),
      deleteSecret: jest.fn(),
    };
    jest.doMock('../../../../../../server/src/config/container', () => ({
      secretsManager: mockSecretsManager,
    }));
  });

  describe('listSecretsStatus', () => {
    it('returns array of all secrets with configured and required flags', () => {
      mockSecretsManager.has.mockImplementation((key: string) => key === 'db_password');

      const result = listSecretsStatus();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('configured');
      expect(result[0]).toHaveProperty('required');
    });

    it('marks db_password as required', () => {
      mockSecretsManager.has.mockReturnValue(false);
      const result = listSecretsStatus();
      const dbPasswordEntry = result.find((s: any) => s.key === 'db_password');
      expect(dbPasswordEntry?.required).toBe(true);
    });

    it('marks session_secret as required', () => {
      mockSecretsManager.has.mockReturnValue(false);
      const result = listSecretsStatus();
      const sessionSecretEntry = result.find((s: any) => s.key === 'session_secret');
      expect(sessionSecretEntry?.required).toBe(true);
    });

    it('marks optional secrets as not required', () => {
      mockSecretsManager.has.mockReturnValue(false);
      const result = listSecretsStatus();
      const mapboxEntry = result.find((s: any) => s.key === 'mapbox_token');
      expect(mapboxEntry?.required).toBe(false);
    });

    it('reflects configured status from secretsManager.has()', () => {
      mockSecretsManager.has.mockImplementation(
        (key: string) => key === 'db_password' || key === 'mapbox_token'
      );
      const result = listSecretsStatus();

      const configured = result.filter((s: any) => s.configured);
      expect(configured.length).toBe(2);
      expect(configured.map((s: any) => s.key)).toContain('db_password');
      expect(configured.map((s: any) => s.key)).toContain('mapbox_token');
    });
  });

  describe('storeSecret', () => {
    it('calls secretsManager.putSecret with key and value', async () => {
      mockSecretsManager.putSecret.mockResolvedValue(undefined);
      await storeSecret('test_key', 'test_value');
      expect(mockSecretsManager.putSecret).toHaveBeenCalledWith('test_key', 'test_value');
    });

    it('throws error when value is empty string', async () => {
      await expect(storeSecret('test_key', '')).rejects.toThrow('Value is required');
    });

    it('throws error when value is undefined', async () => {
      await expect(storeSecret('test_key', undefined as any)).rejects.toThrow('Value is required');
    });

    it('throws error when value is null', async () => {
      await expect(storeSecret('test_key', null as any)).rejects.toThrow('Value is required');
    });

    it('propagates secretsManager errors', async () => {
      mockSecretsManager.putSecret.mockRejectedValue(new Error('Storage failed'));
      await expect(storeSecret('test_key', 'value')).rejects.toThrow('Storage failed');
    });
  });

  describe('deleteSecret', () => {
    it('calls secretsManager.deleteSecret with key', async () => {
      mockSecretsManager.deleteSecret.mockResolvedValue(undefined);
      await deleteSecret('optional_key');
      expect(mockSecretsManager.deleteSecret).toHaveBeenCalledWith('optional_key');
    });

    it('throws REQUIRED error when deleting db_password', async () => {
      const error = await deleteSecret('db_password').catch((e: any) => e);
      expect(error.message).toBe('Cannot delete required secrets');
      expect(error.code).toBe('REQUIRED');
    });

    it('throws REQUIRED error when deleting session_secret', async () => {
      const error = await deleteSecret('session_secret').catch((e: any) => e);
      expect(error.message).toBe('Cannot delete required secrets');
      expect(error.code).toBe('REQUIRED');
    });

    it('allows deletion of optional secrets', async () => {
      mockSecretsManager.deleteSecret.mockResolvedValue(undefined);
      await deleteSecret('mapbox_token');
      expect(mockSecretsManager.deleteSecret).toHaveBeenCalledWith('mapbox_token');
    });

    it('propagates secretsManager errors for optional secrets', async () => {
      mockSecretsManager.deleteSecret.mockRejectedValue(new Error('Deletion failed'));
      await expect(deleteSecret('mapbox_token')).rejects.toThrow('Deletion failed');
    });
  });
});
