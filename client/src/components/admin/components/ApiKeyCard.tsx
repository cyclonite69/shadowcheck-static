import React from 'react';
import { AdminCard } from './AdminCard';

export interface ApiKeyField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'password';
}

interface ApiKeyCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  color: string;
  ringColor: string;
  buttonGradient: string;
  fields: ApiKeyField[];
  isConfigured: boolean;
  onSave: () => void;
  isLoading: boolean;
  saveLabel: string;
}

export const ApiKeyCard: React.FC<ApiKeyCardProps> = ({
  icon,
  title,
  color,
  ringColor,
  buttonGradient,
  fields,
  isConfigured,
  onSave,
  isLoading,
  saveLabel,
}) => (
  <AdminCard icon={icon} title={title} color={color}>
    <div className="space-y-4">
      {fields.map((field, i) => (
        <div key={i}>
          <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
            {field.label}
          </label>
          <input
            type={field.type || 'text'}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/60 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 ${ringColor} transition-all`}
          />
        </div>
      ))}
      <div className="mt-2 text-xs text-slate-400">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isConfigured ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
          }`}
        >
          {isConfigured ? '\u2713 Configured' : '\u2717 Not Configured'}
        </span>
      </div>
      <button
        onClick={onSave}
        disabled={isLoading}
        className={`w-full px-4 py-2.5 bg-gradient-to-r ${buttonGradient} text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm`}
      >
        {isLoading ? 'Saving...' : saveLabel}
      </button>
    </div>
  </AdminCard>
);
