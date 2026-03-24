import React from 'react';
import { AdminCard } from '../../components/AdminCard';
import { SavedValueInput } from './SavedValueInput';

const RadioIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

interface WigleConfigProps {
  wigleApiName: string;
  setWigleApiName: (val: string) => void;
  savedWigleApiName: string;
  wigleApiToken: string;
  setWigleApiToken: (val: string) => void;
  savedWigleApiToken: string;
  isSaving: boolean;
  onSave: () => void;
  isConfigured?: boolean;
}

export const WigleConfig: React.FC<WigleConfigProps> = ({
  wigleApiName,
  setWigleApiName,
  savedWigleApiName,
  wigleApiToken,
  setWigleApiToken,
  savedWigleApiToken,
  isSaving,
  onSave,
  isConfigured,
}) => {
  const hasChanges = wigleApiName !== savedWigleApiName || wigleApiToken !== savedWigleApiToken;

  return (
    <AdminCard
      title="WiGLE Configuration"
      icon={RadioIcon}
      color="from-cyan-600 to-blue-600"
      isConfigured={isConfigured}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">API Name</label>
          <SavedValueInput
            actualValue={wigleApiName}
            savedValue={savedWigleApiName}
            onChange={setWigleApiName}
            placeholder="AID..."
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">API Token</label>
          <SavedValueInput
            actualValue={wigleApiToken}
            savedValue={savedWigleApiToken}
            onChange={setWigleApiToken}
            sensitive={true}
            placeholder="Token"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className={`w-full py-2.5 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save WiGLE Settings'}
        </button>
      </div>
    </AdminCard>
  );
};
