import React from 'react';
import { AdminCard } from '../../components/AdminCard';
import { SavedValueInput } from './SavedValueInput';

const ShieldIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

interface SmartyConfigProps {
  smartyAuthId: string;
  setSmartyAuthId: (val: string) => void;
  savedSmartyAuthId: string;
  smartyAuthToken: string;
  setSmartyAuthToken: (val: string) => void;
  savedSmartyAuthToken: string;
  isSaving: boolean;
  onSave: () => void;
  isConfigured?: boolean;
}

export const SmartyConfig: React.FC<SmartyConfigProps> = ({
  smartyAuthId,
  setSmartyAuthId,
  savedSmartyAuthId,
  smartyAuthToken,
  setSmartyAuthToken,
  savedSmartyAuthToken,
  isSaving,
  onSave,
  isConfigured,
}) => {
  const hasChanges = smartyAuthId !== savedSmartyAuthId || smartyAuthToken !== savedSmartyAuthToken;

  return (
    <AdminCard
      title="Smarty Configuration"
      icon={ShieldIcon}
      color="from-indigo-600 to-violet-600"
      isConfigured={isConfigured}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Auth ID</label>
          <SavedValueInput
            actualValue={smartyAuthId}
            savedValue={savedSmartyAuthId}
            onChange={setSmartyAuthId}
            placeholder="ID"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Auth Token</label>
          <SavedValueInput
            actualValue={smartyAuthToken}
            savedValue={savedSmartyAuthToken}
            onChange={setSmartyAuthToken}
            sensitive={true}
            placeholder="Token"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className={`w-full py-2.5 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Smarty Settings'}
        </button>
      </div>
    </AdminCard>
  );
};
