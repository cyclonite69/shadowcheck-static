import React from 'react';

interface ConfigSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isSaving?: boolean;
  onSave?: () => void;
  hasChanges?: boolean;
  isConfigured?: boolean;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  icon,
  children,
  isSaving,
  onSave,
  hasChanges,
  isConfigured,
}) => (
  <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80">
      <div className="flex items-center gap-3">
        <div className="text-blue-400">{icon}</div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {isConfigured && (
              <span className="px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                Configured
              </span>
            )}
          </div>
        </div>
      </div>
      {onSave && (
        <button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            hasChanges
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
    <div className="p-6 space-y-6">{children}</div>
  </div>
);

interface ConfigFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const ConfigField: React.FC<ConfigFieldProps> = ({ label, description, children }) => (
  <div className="space-y-2">
    <div className="flex flex-col">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {description && <span className="text-xs text-slate-500">{description}</span>}
    </div>
    {children}
  </div>
);
