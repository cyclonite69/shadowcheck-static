/**
 * Dashboard Metric Card Component
 */

import React from 'react';
import { GripHorizontal } from './icons';

export interface CardData {
  id: number;
  title: string;
  value: number | string;
  icon: React.FC<any>;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  observations?: number;
}

interface MetricCardProps {
  card: CardData;
  isActive: boolean;
  onMouseDown: (e: React.MouseEvent, id: number, action: 'move' | 'resize') => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ card, isActive, onMouseDown }) => {
  const Icon = card.icon;
  const width = `${card.w}%`;
  const left = `${card.x}%`;

  return (
    <div
      key={card.id}
      style={{
        left,
        top: `${card.y}px`,
        width,
        height: `${card.h}px`,
        transition: isActive ? 'none' : 'box-shadow 0.2s ease',
      }}
      onMouseDown={(e) => onMouseDown(e, card.id, 'move')}
      className={`absolute p-1.5 ${isActive ? 'cursor-grabbing select-none z-30' : 'cursor-grab'}`}
    >
      <div className="h-full w-full rounded-xl border border-slate-700/40 bg-slate-900/40 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden flex flex-col hover:border-slate-600/50">
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-xl" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-700/30 flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-200 truncate">{card.title}</h3>
          <GripHorizontal
            size={14}
            className="text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-slate-300 transition-all flex-shrink-0"
          />
        </div>

        {/* Content */}
        <div
          className={`flex-1 px-3 py-2 flex flex-col overflow-hidden ${
            card.type === 'analytics-link'
              ? 'cursor-pointer hover:bg-slate-800/20 transition-all items-center justify-center'
              : 'items-center justify-center'
          }`}
          onClick={() => {
            if (card.type === 'analytics-link') {
              window.location.href = '/analytics';
            }
          }}
        >
          {card.type === 'analytics-link' ? (
            <div className="text-center space-y-1">
              <div className="bg-slate-800/40 rounded p-2 inline-block">
                <Icon
                  size={22}
                  className="drop-shadow-lg opacity-90"
                  style={{ color: card.color }}
                />
              </div>
              <p className="text-xs font-semibold text-slate-200">View Analytics</p>
              <p className="text-[10px] text-slate-500">Detailed charts & insights</p>
            </div>
          ) : (
            <div className="text-center space-y-1 w-full">
              <div className="bg-slate-800/40 rounded p-1.5 inline-block">
                <Icon
                  size={20}
                  className="drop-shadow-lg opacity-90"
                  style={{ color: card.color }}
                />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Unique Networks
                </p>
                <p
                  className="text-2xl font-bold tracking-tight leading-tight"
                  style={{ color: card.color }}
                >
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </p>
              </div>
              {card.observations !== undefined && card.type !== 'analytics-link' && (
                <div className="pt-1 border-t border-slate-700/30">
                  <p className="text-sm font-semibold text-slate-200 tabular-nums leading-tight">
                    {card.observations.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Observations</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
