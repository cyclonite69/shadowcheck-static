import { useState, useMemo, useCallback } from 'react';
import type { ColumnBadgeConfig, BadgePreset } from '../../types/badgeConfig';
import { BADGE_DEFAULTS } from './badgeDefaults';

const LS_KEY_CONFIGS = 'shadowcheck_badge_column_configs';
const LS_KEY_PRESET = 'shadowcheck_badge_active_preset';
const LS_KEY_PRESETS = 'shadowcheck_badge_presets';

function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

/**
 * Merge order (last wins): BADGE_DEFAULTS → active preset columns → unsaved per-column overrides.
 * All configs start with enabled: false — nothing renders until the user opts in.
 */
export function useBadgeConfigs(): {
  configs: Record<string, ColumnBadgeConfig>;
  presets: BadgePreset[];
  activePresetId: string | null;
  updateColumnConfig: (column: string, cfg: ColumnBadgeConfig) => void;
  activatePreset: (id: string | null) => void;
  saveAsPreset: (name: string, description?: string) => BadgePreset;
  deletePreset: (id: string) => void;
} {
  const [unsaved, setUnsaved] = useState<Record<string, ColumnBadgeConfig>>(
    () => readLocalStorage<Record<string, ColumnBadgeConfig>>(LS_KEY_CONFIGS) ?? {}
  );

  const [presets, setPresets] = useState<BadgePreset[]>(
    () => readLocalStorage<BadgePreset[]>(LS_KEY_PRESETS) ?? []
  );

  const [activePresetId, setActivePresetId] = useState<string | null>(() =>
    readLocalStorage<string>(LS_KEY_PRESET)
  );

  const configs = useMemo<Record<string, ColumnBadgeConfig>>(() => {
    const base: Record<string, ColumnBadgeConfig> = { ...BADGE_DEFAULTS };

    // Apply active preset columns
    const activePreset = presets.find((p) => p.id === activePresetId);
    if (activePreset) {
      for (const cfg of activePreset.columns) {
        base[cfg.column] = cfg;
      }
    }

    // Apply unsaved per-column overrides
    for (const [col, cfg] of Object.entries(unsaved)) {
      base[col] = cfg;
    }

    return base;
  }, [unsaved, presets, activePresetId]);

  const updateColumnConfig = useCallback((column: string, cfg: ColumnBadgeConfig) => {
    setUnsaved((prev) => {
      const next = { ...prev, [column]: cfg };
      writeLocalStorage(LS_KEY_CONFIGS, next);
      return next;
    });
  }, []);

  const activatePreset = useCallback((id: string | null) => {
    setActivePresetId(id);
    writeLocalStorage(LS_KEY_PRESET, id);
  }, []);

  const saveAsPreset = useCallback(
    (name: string, description?: string): BadgePreset => {
      const now = new Date().toISOString();
      const preset: BadgePreset = {
        id: `preset_${Date.now()}`,
        name,
        description,
        columns: Object.values(configs),
        createdAt: now,
        updatedAt: now,
      };
      setPresets((prev) => {
        const next = [...prev, preset];
        writeLocalStorage(LS_KEY_PRESETS, next);
        return next;
      });
      return preset;
    },
    [configs]
  );

  const deletePreset = useCallback(
    (id: string) => {
      setPresets((prev) => {
        const next = prev.filter((p) => p.id !== id);
        writeLocalStorage(LS_KEY_PRESETS, next);
        return next;
      });
      if (activePresetId === id) {
        setActivePresetId(null);
        writeLocalStorage(LS_KEY_PRESET, null);
      }
    },
    [activePresetId]
  );

  return {
    configs,
    presets,
    activePresetId,
    updateColumnConfig,
    activatePreset,
    saveAsPreset,
    deletePreset,
  };
}
