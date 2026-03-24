import React from 'react';
import { AdminCard } from '../../components/AdminCard';

const BrainIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

interface ModelOperationsCardProps {
  mlLoading: boolean;
  mlStatus: any;
  mlResult: any;
  trainModel: () => void;
  recalculateScores: (limit?: number) => void;
}

export const ModelOperationsCard: React.FC<ModelOperationsCardProps> = ({
  mlLoading,
  mlStatus,
  mlResult,
  trainModel,
  recalculateScores,
}) => (
  <AdminCard icon={BrainIcon} title="Model Operations" color="from-pink-500 to-pink-600">
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Manage machine learning model for threat detection.</p>

      <div className="space-y-2">
        <button
          onClick={trainModel}
          disabled={mlLoading}
          className="w-full p-3 rounded-lg bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 disabled:opacity-50 text-white font-medium text-sm transition-all"
        >
          {mlLoading ? 'Training...' : 'Train Model'}
        </button>
        <button
          onClick={() => recalculateScores(5000)}
          disabled={mlLoading || !mlStatus?.modelTrained}
          className="w-full p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-50 text-white font-medium text-sm border border-slate-700/60 transition-all"
        >
          {mlLoading ? 'Calculating...' : 'Recalculate Scores'}
        </button>
      </div>

      {mlResult && (
        <div
          className={`p-3 rounded-lg text-sm ${
            mlResult.type === 'success'
              ? 'bg-green-900/30 text-green-300 border border-green-700/50'
              : 'bg-red-900/30 text-red-300 border border-red-700/50'
          }`}
        >
          {mlResult.message}
        </div>
      )}

      <div className="text-xs text-slate-500 space-y-1 pt-3 border-t border-slate-700/50">
        <p>✓ Requires 10+ tagged networks</p>
        <p>✓ Logistic regression algorithm</p>
        <p>✓ Training: 5-30 seconds</p>
      </div>
    </div>
  </AdminCard>
);
