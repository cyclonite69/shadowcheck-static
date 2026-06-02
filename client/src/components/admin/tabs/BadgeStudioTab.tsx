import React from 'react';
import { BadgeRenderer, useBadgeConfigs, BADGE_PREVIEW_SAMPLES } from '../../badgeStudio';

/**
 * Admin tab for Badge Studio — column badge rendering, palettes, and config experiments.
 * Gated by the badgeStudio runtime feature flag.
 */
export const BadgeStudioTab: React.FC = () => {
  const { configs } = useBadgeConfigs();

  const columns = Object.keys(BADGE_PREVIEW_SAMPLES);

  return (
    <div className="space-y-6 px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Badge Studio</h2>
        <p className="mt-1 text-sm text-slate-400">
          Column badge rendering preview. Badges are opt-in — enable them per-column in the
          Explorer's column settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => {
          const cfg = configs[col];
          const samples = BADGE_PREVIEW_SAMPLES[col];
          if (!cfg) return null;
          return (
            <div
              key={col}
              className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {col}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    cfg.enabled
                      ? 'border-green-500/40 bg-green-500/10 text-green-400'
                      : 'border-slate-600/40 bg-slate-800/40 text-slate-500'
                  }`}
                >
                  {cfg.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {samples.map((val, i) => (
                  <BadgeRenderer key={i} value={val} config={cfg} />
                ))}
              </div>
              <div className="text-xs text-slate-600">
                shape: {cfg.shape} · fill: {cfg.fill} · size: {cfg.size}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
