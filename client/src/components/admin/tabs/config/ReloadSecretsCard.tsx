import React, { useState } from 'react';
import { apiClient } from '../../../../api/client';

export const ReloadSecretsCard: React.FC = () => {
  const [reloading, setReloading] = useState(false);
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);

  const reloadSecrets = async () => {
    setReloading(true);
    setReloadMsg(null);
    try {
      const result = await apiClient.post<{
        ok: boolean;
        smReachable: boolean;
        smLastError: string | null;
      }>('/settings/reload-secrets', {});
      setReloadMsg(
        result.smReachable
          ? '✓ Secrets reloaded from AWS SM'
          : `⚠ SM unreachable: ${result.smLastError}`
      );
    } catch (e: any) {
      setReloadMsg(`✗ ${e.message}`);
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-lg flex items-center gap-4">
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-200">Reload Secrets from AWS SM</div>
        <div className="text-xs text-slate-400 mt-0.5">
          Forces the server to re-fetch all credentials from Secrets Manager without a container
          restart. Use this after saving API keys if they aren't taking effect.
        </div>
        {reloadMsg && (
          <div
            className={`text-xs mt-1 font-mono ${reloadMsg.startsWith('✓') ? 'text-green-400' : 'text-amber-400'}`}
          >
            {reloadMsg}
          </div>
        )}
      </div>
      <button
        onClick={reloadSecrets}
        disabled={reloading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
      >
        {reloading ? 'Reloading…' : 'Reload Secrets'}
      </button>
    </div>
  );
};
