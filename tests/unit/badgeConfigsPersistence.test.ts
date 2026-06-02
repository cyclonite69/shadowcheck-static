import type { ColumnBadgeConfig } from '../../client/src/types/badgeConfig';
import {
  BADGE_COLUMN_CONFIGS_STORAGE_KEY,
  createFallbackBadgeConfig,
  readStoredColumnBadgeConfigs,
  removeStoredColumnBadgeConfig,
  writeStoredColumnBadgeConfigs,
} from '../../client/src/components/badgeStudio/useBadgeConfigs';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const makeConfig = (enabled: boolean): ColumnBadgeConfig => ({
  column: 'threat_score',
  enabled,
  shape: 'pill',
  fill: 'ghost',
  size: 'normal',
  defaultColor: { accentColor: '#ef4444' },
  rules: [{ match: { type: 'any' }, color: { accentColor: '#ef4444' } }],
});

describe('Badge Studio column config persistence', () => {
  it('saves and loads column configs from the v1 storage key', () => {
    const storage = new MemoryStorage();
    const config = makeConfig(true);

    writeStoredColumnBadgeConfigs({ threat_score: config }, storage);

    expect(storage.getItem(BADGE_COLUMN_CONFIGS_STORAGE_KEY)).toContain('threat_score');
    expect(readStoredColumnBadgeConfigs(storage)).toEqual({ threat_score: config });
  });

  it('loads an empty object for missing or invalid storage', () => {
    const storage = new MemoryStorage();

    expect(readStoredColumnBadgeConfigs(storage)).toEqual({});

    storage.setItem(BADGE_COLUMN_CONFIGS_STORAGE_KEY, '{bad json');
    expect(readStoredColumnBadgeConfigs(storage)).toEqual({});
  });

  it('persists disabled configs instead of removing them', () => {
    const storage = new MemoryStorage();
    const disabled = makeConfig(false);

    writeStoredColumnBadgeConfigs({ threat_score: disabled }, storage);

    expect(readStoredColumnBadgeConfigs(storage).threat_score.enabled).toBe(false);
  });

  it('removes one column config on reset without touching other columns', () => {
    const current = {
      threat_score: makeConfig(true),
      type: { ...makeConfig(true), column: 'type' },
    };

    expect(removeStoredColumnBadgeConfig(current, 'threat_score')).toEqual({
      type: current.type,
    });
  });

  it('creates a disabled fallback config for columns without smart defaults', () => {
    expect(createFallbackBadgeConfig('geocoded_city')).toMatchObject({
      column: 'geocoded_city',
      enabled: false,
      shape: 'pill',
      fill: 'ghost',
    });
  });
});
