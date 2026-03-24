import React from 'react';
import { AdminCard } from '../../components/AdminCard';

const BarChartIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

interface TrainingDataCardProps {
  mlStatus: any;
}

export const TrainingDataCard: React.FC<TrainingDataCardProps> = ({ mlStatus }) => (
  <AdminCard icon={BarChartIcon} title="Training Data" color="from-purple-500 to-purple-600">
    <div className="space-y-3">
      {mlStatus && mlStatus.taggedNetworks && mlStatus.taggedNetworks.length > 0 ? (
        <>
          {mlStatus.taggedNetworks.map((tag: any, idx: number) => (
            <div
              key={idx}
              className="flex justify-between items-center p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/30"
            >
              <span className="text-sm text-slate-300 capitalize">
                {tag.tag_type.replace('_', ' ')}
              </span>
              <span className="text-sm font-semibold text-blue-400">{tag.count}</span>
            </div>
          ))}
          <div className="mt-3 p-2.5 bg-slate-700/30 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-300">
              Total:{' '}
              <strong>
                {mlStatus.taggedNetworks.reduce((s: number, t: any) => s + t.count, 0)}
              </strong>{' '}
              tagged
            </span>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-500 py-8">
          <p className="text-sm">No tagged networks</p>
          <p className="text-xs mt-1">Tag networks to enable training</p>
        </div>
      )}
    </div>
  </AdminCard>
);
