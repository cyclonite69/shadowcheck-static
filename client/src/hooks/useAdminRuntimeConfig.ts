import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import type { AdminRuntimeConfig } from '../types/admin';

export const ADMIN_RUNTIME_CONFIG_CHANGED_EVENT = 'admin-runtime-config-changed';

/**
 * Load the existing admin runtime configuration and track same-window flag changes.
 * Disabled and failed requests return null so feature consumers fail closed.
 */
export function useAdminRuntimeConfig(enabled: boolean): AdminRuntimeConfig | null {
  const [runtimeConfig, setRuntimeConfig] = useState<AdminRuntimeConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setRuntimeConfig(null);
      return () => {
        cancelled = true;
      };
    }

    const loadRuntimeConfig = async () => {
      try {
        const data = await adminApi.getRuntimeConfig();
        if (!cancelled) {
          setRuntimeConfig(data);
        }
      } catch {
        if (!cancelled) {
          setRuntimeConfig(null);
        }
      }
    };

    const handleRuntimeConfigChange = (event: Event) => {
      const customEvent = event as CustomEvent<AdminRuntimeConfig>;
      if (!cancelled && customEvent.detail) {
        setRuntimeConfig(customEvent.detail);
      }
    };

    void loadRuntimeConfig();
    window.addEventListener(ADMIN_RUNTIME_CONFIG_CHANGED_EVENT, handleRuntimeConfigChange);

    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_RUNTIME_CONFIG_CHANGED_EVENT, handleRuntimeConfigChange);
    };
  }, [enabled]);

  return runtimeConfig;
}
