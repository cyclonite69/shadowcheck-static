/**
 * AdminSettingsService Unit Tests
 */

import { adminQuery } from '../../../server/src/services/adminDbService';
import { query } from '../../../server/src/config/database';
import {
  getAllSettings,
  getSettingByKey,
  updateSetting,
  toggleMLBlending,
  saveMLModelConfig,
  setAwsRegion,
} from '../../../server/src/services/adminSettingsService';

jest.mock('../../../server/src/services/adminDbService');
jest.mock('../../../server/src/config/database');

describe('AdminSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSettings', () => {
    it('should return all settings', async () => {
      const mockSettings = [
        { key: 's1', value: 'v1' },
        { key: 's2', value: 'v2' },
      ];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockSettings });

      const settings = await getAllSettings();

      expect(settings).toEqual(mockSettings);
      expect(query).toHaveBeenCalled();
      const [sql, params] = (query as jest.Mock).mock.calls[0];
      expect(sql).toEqual(
        'SELECT key, value, description, updated_at FROM app.settings ORDER BY key'
      );
      expect(params).toBeUndefined();
    });
  });

  describe('getSettingByKey', () => {
    it('should return setting by key', async () => {
      const mockSetting = { value: 'v1', description: 'd1' };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockSetting] });

      const setting = await getSettingByKey('s1');

      expect(setting).toEqual(mockSetting);
      expect(query).toHaveBeenCalled();
      const [sql, params] = (query as jest.Mock).mock.calls[0];
      expect(sql).toEqual('SELECT value, description, updated_at FROM app.settings WHERE key = $1');
      expect(params).toEqual(['s1']);
    });

    it('should return null if setting not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const setting = await getSettingByKey('unknown');

      expect(setting).toBeNull();
    });
  });

  describe('updateSetting', () => {
    it('should update setting', async () => {
      const mockResult = { key: 's1', value: '"new_value"' };
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [mockResult] });

      const result = await updateSetting('s1', 'new_value');

      expect(result).toEqual(mockResult);
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toEqual(
        'UPDATE app.settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *'
      );
      expect(params).toEqual(['"new_value"', 's1']);
    });
  });

  describe('toggleMLBlending', () => {
    it('should toggle ML blending setting', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [{ value: 'true' }] });

      const result = await toggleMLBlending();

      expect(result).toBe('true');
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('UPDATE app.settings');
      expect(sql).toContain(
        "SET value = CASE WHEN value::text = 'true' THEN 'false' ELSE 'true' END"
      );
      expect(sql).toContain('updated_at = NOW()');
      expect(sql).toContain("WHERE key = 'ml_blending_enabled'");
      expect(sql).toContain('RETURNING value');
      expect(params).toBeUndefined();
    });

    it('should handle missing return row', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await toggleMLBlending();

      expect(result).toBeUndefined();
    });
  });

  describe('saveMLModelConfig', () => {
    it('should save ML model config', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const result = await saveMLModelConfig('logistic', { a: 1 }, 0.5, ['f1', 'f2']);

      expect(result).toBe(true);
      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain(
        'INSERT INTO app.ml_model_config (model_type, coefficients, intercept, feature_names, created_at)'
      );
      expect(sql).toContain('VALUES ($1, $2, $3, $4, NOW())');
      expect(sql).toContain('ON CONFLICT (model_type) DO UPDATE');
      expect(sql).toContain(
        'SET coefficients = $2, intercept = $3, feature_names = $4, updated_at = NOW()'
      );
      expect(params).toEqual(['logistic', '{"a":1}', 0.5, '["f1","f2"]']);
    });

    it('should return false if rowCount is 0', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const result = await saveMLModelConfig('logistic', {}, 0, []);

      expect(result).toBe(false);
    });
  });

  describe('setAwsRegion', () => {
    it('should save AWS region setting', async () => {
      (adminQuery as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      await setAwsRegion('us-east-1');

      expect(adminQuery).toHaveBeenCalled();
      const [sql, params] = (adminQuery as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO app.settings (key, value, description)');
      expect(sql).toContain('VALUES ($1, $2::jsonb, $3)');
      expect(sql).toContain('ON CONFLICT (key) DO UPDATE');
      expect(sql).toContain('SET value = EXCLUDED.value');
      expect(sql).toContain('description = EXCLUDED.description');
      expect(sql).toContain('updated_at = NOW()');
      expect(params).toEqual([
        'aws_region',
        '"us-east-1"',
        'AWS region for runtime provider chain integrations',
      ]);
    });
  });
});
