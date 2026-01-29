import React from 'react';

interface AdminCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  color: string;
  children: React.ReactNode;
  compact?: boolean;
}

export const AdminCard: React.FC<AdminCardProps> = ({
  icon: Icon,
  title,
  color,
  children,
  compact = false,
}) => (
  <div className="group relative overflow-hidden rounded-xl border border-slate-700/40 bg-slate-900/50 backdrop-blur-sm shadow-lg hover:shadow-xl hover:border-slate-600/60 transition-all duration-300">
    {/* Ambient gradient effect on hover */}
    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

    {/* Header section - consistent spacing */}
    <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-800/60 bg-gradient-to-r from-slate-900/80 to-slate-900/40">
      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color} shadow-lg flex-shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <h2 className="text-sm font-semibold text-slate-100 tracking-wide">{title}</h2>
    </div>

    {/* Content section - flexible padding */}
    <div className={compact ? 'px-6 py-3' : 'px-6 py-5'}>{children}</div>
  </div>
);
