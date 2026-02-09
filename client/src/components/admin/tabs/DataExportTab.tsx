import React from 'react';
import { AdminCard } from '../components/AdminCard';

const DownloadIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const DataExportTab: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Network Exports */}
      <AdminCard icon={DownloadIcon} title="Network Exports" color="from-blue-500 to-blue-600">
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            Export scanned networks in multiple formats for analysis and integration.
          </p>
          <button
            onClick={() => window.open('/api/csv', '_blank')}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-500 hover:to-blue-600 transition-all text-sm"
          >
            Export as CSV
          </button>
          <button
            onClick={() => window.open('/api/json', '_blank')}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-medium hover:from-slate-500 hover:to-slate-600 transition-all text-sm"
          >
            Export as JSON
          </button>
        </div>
      </AdminCard>

      {/* Geospatial Export */}
      <AdminCard icon={DownloadIcon} title="Geospatial Export" color="from-green-500 to-green-600">
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            Export observation data in GeoJSON format compatible with GIS tools and mapping
            applications.
          </p>
          <button
            onClick={() => window.open('/api/geojson', '_blank')}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-500 hover:to-green-600 transition-all text-sm"
          >
            Export as GeoJSON
          </button>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
            <p className="mt-2">Compatible with:</p>
            <p>• QGIS, ArcGIS</p>
            <p>• Leaflet, Mapbox</p>
          </div>
        </div>
      </AdminCard>
    </div>
  );
};
