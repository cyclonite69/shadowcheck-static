import React from 'react';
import { AdminCard } from './AdminCard';

interface HomeLocationCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  homeLocation: { lat: string; lng: string; radius: string };
  setHomeLocation: (loc: { lat: string; lng: string; radius: string }) => void;
  onSave: () => void;
  isLoading: boolean;
}

export const HomeLocationCard: React.FC<HomeLocationCardProps> = ({
  icon,
  homeLocation,
  setHomeLocation,
  onSave,
  isLoading,
}) => (
  <AdminCard icon={icon} title="Home Location" color="from-green-500 to-green-600">
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
            Latitude
          </label>
          <input
            type="number"
            value={homeLocation.lat}
            onChange={(e) => setHomeLocation({ ...homeLocation, lat: e.target.value })}
            placeholder="39.1031"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/60 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
            Longitude
          </label>
          <input
            type="number"
            value={homeLocation.lng}
            onChange={(e) => setHomeLocation({ ...homeLocation, lng: e.target.value })}
            placeholder="-84.5120"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/60 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
          Radius: {homeLocation.radius}m
        </label>
        <input
          type="range"
          min="10"
          max="5000"
          step="10"
          value={homeLocation.radius}
          onChange={(e) => setHomeLocation({ ...homeLocation, radius: e.target.value })}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>10m</span>
          <span>5km</span>
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={isLoading}
        className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-500 hover:to-green-600 transition-all disabled:opacity-50 text-sm"
      >
        {isLoading ? 'Saving...' : 'Save Location'}
      </button>
    </div>
  </AdminCard>
);
