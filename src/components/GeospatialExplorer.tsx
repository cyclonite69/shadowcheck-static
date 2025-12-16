import React, { useEffect, useMemo, useRef, useState } from 'react';

type NetworkRow = {
  bssid: string;
  ssid: string;
  type: 'W' | 'E' | 'B' | 'L' | null;
  signal: number | null;
  security: string | null;
  frequency: number | null;
  channel?: number | null;
  observations: number;
  latitude: number | null;
  longitude: number | null;
  distanceFromHome?: number | null;
  accuracy?: number | null;
  lastSeen: string | null;
};

type Observation = {
  id: string | number;
  bssid: string;
  lat: number;
  lon: number;
  signal: number | null;
  time: number;
  acc?: number | null;
  distance_from_home_km?: number | null;
};

const NetworkIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M5 22v-5M19 22v-5M12 8v-3M7 19h10" />
  </svg>
);

const SearchIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SettingsIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08 4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08 4.24-4.24" />
  </svg>
);

const GripHorizontal = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
  </svg>
);

const NETWORK_COLUMNS: Record<
  keyof NetworkRow | 'select',
  { label: string; width: number; sortable: boolean; default: boolean }
> = {
  select: { label: '✓', width: 40, sortable: false, default: true },
  type: { label: 'Type', width: 80, sortable: true, default: true },
  ssid: { label: 'SSID', width: 150, sortable: true, default: true },
  bssid: { label: 'BSSID', width: 120, sortable: true, default: true },
  signal: { label: 'Signal (dBm)', width: 100, sortable: true, default: true },
  security: { label: 'Security', width: 100, sortable: true, default: true },
  frequency: { label: 'Frequency (GHz)', width: 120, sortable: true, default: false },
  channel: { label: 'Channel', width: 80, sortable: true, default: false },
  observations: { label: 'Observations', width: 110, sortable: true, default: false },
  latitude: { label: 'Latitude', width: 110, sortable: true, default: false },
  longitude: { label: 'Longitude', width: 110, sortable: true, default: false },
  distanceFromHome: { label: 'Distance (km)', width: 110, sortable: true, default: false },
  accuracy: { label: 'Accuracy (m)', width: 100, sortable: true, default: false },
  lastSeen: { label: 'Last Seen', width: 160, sortable: true, default: true },
};

const TypeBadge = ({ type }: { type: NetworkRow['type'] }) => {
  const types: Record<string, { label: string; color: string }> = {
    W: { label: 'WiFi', color: '#3b82f6' },
    E: { label: 'BLE', color: '#8b5cf6' },
    B: { label: 'BT', color: '#3b82f6' },
    L: { label: 'LTE', color: '#10b981' },
    default: { label: 'WiFi', color: '#3b82f6' },
  };
  const t = types[type || 'default'] || types.default;
  return (
    <span
      className="px-2 py-1 text-xs font-medium rounded"
      style={{
        backgroundColor: `${t.color}22`,
        borderColor: `${t.color}44`,
        border: '1px solid',
        color: t.color,
      }}
    >
      {t.label}
    </span>
  );
};

type CardState = {
  id: number;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'map' | 'networks';
};

type SortState = { column: keyof NetworkRow; direction: 'asc' | 'desc' };

export default function GeospatialExplorer() {
  const HEADER_HEIGHT = 0;
  const FOOTER_HEIGHT = 0;
  const [networks, setNetworks] = useState<NetworkRow[]>([]);
  const [cards, setCards] = useState<CardState[]>([
    { id: 1, title: 'Map', x: 0, y: 0, w: 50, h: 520, type: 'map' },
    { id: 2, title: 'Networks Explorer', x: 50, y: 0, w: 50, h: 520, type: 'networks' },
  ]);

  const [dragging, setDragging] = useState<number | null>(null);
  const [resizing, setResizing] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [visibleColumns, setVisibleColumns] = useState<(keyof NetworkRow | 'select')[]>(
    Object.keys(NETWORK_COLUMNS).filter(
      (k) => NETWORK_COLUMNS[k as keyof typeof NETWORK_COLUMNS].default
    ) as (keyof NetworkRow | 'select')[]
  );
  const [sort, setSort] = useState<SortState[]>([{ column: 'lastSeen', direction: 'desc' }]);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());
  const [hoveredNetwork, setHoveredNetwork] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [observationsByBssid, setObservationsByBssid] = useState<Record<string, Observation[]>>({});
  const columnDropdownRef = useRef<HTMLDivElement | null>(null);
  const activeObservationSets = useMemo(
    () =>
      Array.from(selectedNetworks).map((bssid) => ({
        bssid,
        observations: observationsByBssid[bssid] || [],
      })),
    [observationsByBssid, selectedNetworks]
  );
  const observationCount = useMemo(
    () => activeObservationSets.reduce((acc, set) => acc + set.observations.length, 0),
    [activeObservationSets]
  );

  useEffect(() => {
    const loadNetworks = async () => {
      try {
        setLoadingNetworks(true);
        setError(null);
        const res = await fetch('/api/explorer/networks?limit=1000&order=desc&sort=observed_at');
        if (!res.ok) throw new Error(`networks ${res.status}`);
        const data = await res.json();
        setUsingFallback(Boolean(data.fallback));
        const mapped: NetworkRow[] = (data.rows || []).map((row: any, idx: number) => ({
          bssid: row.bssid || `unknown-${idx}`,
          ssid: row.ssid || '(hidden)',
          type: (row.type || 'W') as NetworkRow['type'],
          signal:
            typeof row.signal === 'number'
              ? row.signal
              : typeof row.level === 'number'
                ? row.level
                : null,
          security: row.capabilities || row.encryption || null,
          frequency: row.frequency != null ? Number(row.frequency) : null,
          channel: row.channel ?? null,
          observations: row.observations ?? 0,
          latitude: row.lat ?? null,
          longitude: row.lon ?? null,
          distanceFromHome: row.distance_from_home_km ?? null,
          accuracy: row.accuracy_meters ?? null,
          lastSeen: row.last_seen
            ? new Date(row.last_seen).toLocaleString()
            : row.observed_at
              ? new Date(row.observed_at).toLocaleString()
              : null,
          _rowKey: `${row.bssid || 'bssid'}-${idx}`,
        }));
        setUsingFallback(false);
        setNetworks(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Failed to load networks');
        setUsingFallback(true);
        setNetworks((prev) => (prev.length ? prev : generateSampleNetworks(150)));
      } finally {
        setLoadingNetworks(false);
      }
    };
    loadNetworks();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchObservations = async () => {
      if (!selectedNetworks.size) {
        setObservationsByBssid({});
        return;
      }
      setLoadingObservations(true);
      setError(null);
      try {
        const entries = await Promise.all(
          Array.from(selectedNetworks).map(async (bssid) => {
            const res = await fetch(`/api/networks/observations/${encodeURIComponent(bssid)}`, {
              signal: controller.signal,
            });
            if (!res.ok) throw new Error(`observations ${res.status}`);
            const data = await res.json();
            const obs: Observation[] = (data.observations || [])
              .filter((o: any) => typeof o.lat === 'number' && typeof o.lon === 'number')
              .map((o: any) => ({
                id: o.id || `${bssid}-${o.time}`,
                bssid,
                lat: o.lat,
                lon: o.lon,
                signal: typeof o.signal === 'number' ? o.signal : (o.signal ?? null),
                time: o.time,
                acc: o.acc ?? null,
                distance_from_home_km: o.distance_from_home_km ?? null,
              }));
            return [bssid, obs] as const;
          })
        );
        setObservationsByBssid(Object.fromEntries(entries));
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError(err?.message || 'Failed to load observations');
      } finally {
        if (!controller.signal.aborted) {
          setLoadingObservations(false);
        }
      }
    };
    fetchObservations();
    return () => controller.abort();
  }, [selectedNetworks]);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    cardId: number,
    mode: 'move' | 'resize' = 'move'
  ) => {
    if (mode === 'move') {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      setDragging(cardId);
      setDragOffset({
        x: e.clientX - (card.x * window.innerWidth) / 100,
        y: e.clientY - card.y,
      });
    } else {
      setResizing(cardId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (dragging) {
      setCards((prev) =>
        prev.map((card) => {
          if (card.id === dragging) {
            const newX = Math.max(
              0,
              Math.min(100 - card.w, ((e.clientX - dragOffset.x) / window.innerWidth) * 100)
            );
            const newY = Math.max(0, e.clientY - dragOffset.y - HEADER_HEIGHT);
            return { ...card, x: newX, y: newY };
          }
          return card;
        })
      );
    } else if (resizing) {
      setCards((prev) =>
        prev.map((card) => {
          if (card.id === resizing) {
            const newW = Math.max(
              20,
              Math.min(
                100 - card.x,
                ((e.clientX - (card.x * window.innerWidth) / 100) / window.innerWidth) * 100
              )
            );
            const newH = Math.max(250, e.clientY - card.y - HEADER_HEIGHT);
            return { ...card, w: newW, h: newH };
          }
          return card;
        })
      );
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (col: keyof NetworkRow | 'select') => {
    setVisibleColumns((v) => (v.includes(col) ? v.filter((c) => c !== col) : [...v, col]));
  };

  const resetColumns = () => {
    setVisibleColumns(
      Object.keys(NETWORK_COLUMNS).filter(
        (k) => NETWORK_COLUMNS[k as keyof typeof NETWORK_COLUMNS].default
      ) as (keyof NetworkRow | 'select')[]
    );
  };

  const handleSort = (column: keyof NetworkRow, shiftKey: boolean) => {
    if (!NETWORK_COLUMNS[column].sortable) return;

    if (shiftKey) {
      const idx = sort.findIndex((s) => s.column === column);
      if (idx > -1) {
        if (sort[idx].direction === 'asc') {
          setSort(sort.map((s, i) => (i === idx ? { ...s, direction: 'desc' } : s)));
        } else {
          setSort(sort.filter((_, i) => i !== idx));
        }
      } else {
        setSort([...sort, { column, direction: 'asc' }]);
      }
    } else {
      const existing = sort.find((s) => s.column === column);
      if (existing && sort.length === 1) {
        setSort([{ column, direction: existing.direction === 'asc' ? 'desc' : 'asc' }]);
      } else {
        setSort([{ column, direction: 'asc' }]);
      }
    }
  };

  const filteredNetworks = useMemo(() => {
    const filtered = networks.filter((n) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return n.ssid.toLowerCase().includes(term) || n.bssid.toLowerCase().includes(term);
    });

    return filtered.sort((a, b) => {
      for (const s of sort) {
        const aVal = a[s.column];
        const bVal = b[s.column];
        let cmp = 0;
        if (typeof aVal === 'number' || typeof bVal === 'number') {
          const aNum = aVal == null ? Number.POSITIVE_INFINITY : Number(aVal);
          const bNum = bVal == null ? Number.POSITIVE_INFINITY : Number(bVal);
          cmp = aNum - bNum;
        } else {
          cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
        }
        if (cmp !== 0) return s.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [networks, searchTerm, sort]);

  const toggleSelectNetwork = (bssid: string) => {
    setSelectedNetworks((prev) => {
      const ns = new Set(prev);
      ns.has(bssid) ? ns.delete(bssid) : ns.add(bssid);
      return ns;
    });
  };

  const renderMapMarkers = () => {
    const fallbackPoints = networks
      .filter((n) => typeof n.latitude === 'number' && typeof n.longitude === 'number')
      .map((n) => ({ lat: n.latitude as number, lon: n.longitude as number, bssid: n.bssid }));

    const activePoints = activeObservationSets.length
      ? activeObservationSets.flatMap((g) =>
          g.observations.map((o) => ({ lat: o.lat, lon: o.lon, bssid: g.bssid }))
        )
      : fallbackPoints;

    const bounds = activePoints.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.lat),
        maxLat: Math.max(acc.maxLat, p.lat),
        minLon: Math.min(acc.minLon, p.lon),
        maxLon: Math.max(acc.maxLon, p.lon),
      }),
      { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity }
    );

    const hasBounds = Number.isFinite(bounds.minLat) && Number.isFinite(bounds.minLon);
    const padLat = hasBounds ? (bounds.maxLat - bounds.minLat || 0.01) * 0.05 : 0.02;
    const padLon = hasBounds ? (bounds.maxLon - bounds.minLon || 0.01) * 0.05 : 0.02;

    const latMin = hasBounds ? bounds.minLat - padLat : 42.92;
    const latMax = hasBounds ? bounds.maxLat + padLat : 43.08;
    const lngMin = hasBounds ? bounds.minLon - padLon : -87.08;
    const lngMax = hasBounds ? bounds.maxLon + padLon : -86.92;

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {activeObservationSets.length
            ? activeObservationSets.map((group, idx) => {
                const colorPalette = ['#38bdf8', '#a78bfa', '#10b981', '#f97316', '#e11d48'];
                const color = colorPalette[idx % colorPalette.length];
                const points = [...group.observations].sort((a, b) => a.time - b.time);
                const pointsString = points
                  .map((p) => {
                    const x = ((p.lon - lngMin) / Math.max(lngMax - lngMin, 0.0001)) * 100;
                    const y = ((latMax - p.lat) / Math.max(latMax - latMin, 0.0001)) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g key={group.bssid}>
                    {points.length > 1 && (
                      <polyline
                        points={pointsString}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.7"
                      />
                    )}
                    {points.map((p, i) => {
                      const x = ((p.lon - lngMin) / Math.max(lngMax - lngMin, 0.0001)) * 100;
                      const y = ((latMax - p.lat) / Math.max(latMax - latMin, 0.0001)) * 100;
                      const key = `${group.bssid}-${p.id}`;
                      const isHovered = hoveredNetwork === group.bssid;
                      return (
                        <g key={key}>
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r={isHovered ? 9 : 7}
                            fill={color}
                            opacity={isHovered ? 0.95 : 0.75}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                            style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                            onMouseEnter={() => setHoveredNetwork(group.bssid)}
                            onMouseLeave={() => setHoveredNetwork(null)}
                          />
                          <text
                            x={`${x}%`}
                            y={`${y}%`}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="9"
                            fill="#0f172a"
                            fontWeight="700"
                          >
                            {i + 1}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })
            : networks
                .filter(
                  (net) => typeof net.latitude === 'number' && typeof net.longitude === 'number'
                )
                .map((net, idx) => {
                  const x = ((Number(net.longitude) - lngMin) / (lngMax - lngMin)) * 100;
                  const y = ((latMax - Number(net.latitude)) / (latMax - latMin)) * 100;
                  const isSelected = selectedNetworks.has(net.bssid);
                  const isHovered = hoveredNetwork === net.bssid;

                  let color = '#3b82f6';
                  if ((net.security || '').toUpperCase().includes('OPEN')) color = '#ef4444';
                  if ((net.security || '').toUpperCase().includes('WPA3')) color = '#10b981';

                  return (
                    <circle
                      key={net._rowKey || `${net.bssid}-${idx}`}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r={isHovered ? 10 : isSelected ? 8 : 6}
                      fill={color}
                      opacity={isSelected ? 1 : isHovered ? 0.9 : 0.6}
                      stroke={isSelected ? '#fbbf24' : 'none'}
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                      onMouseEnter={() => setHoveredNetwork(net.bssid)}
                      onMouseLeave={() => setHoveredNetwork(null)}
                    />
                  );
                })}
        </svg>
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: '11px', color: '#94a3b8' }}>
          📍 {networks.length} networks • {selectedNetworks.size} selected{' '}
          {activeObservationSets.length
            ? `• ${activeObservationSets.flatMap((g) => g.observations).length} observations`
            : ''}
          {usingFallback ? ' • Using fallback sample (API error)' : ''}
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '11px', color: '#94a3b8' }}>
          {loadingObservations && 'Loading observations…'}
          {!loadingObservations &&
          selectedNetworks.size > 0 &&
          !activeObservationSets.flatMap((g) => g.observations).length
            ? 'No observations found'
            : ''}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            fontSize: '10px',
            color: '#64748b',
            lineHeight: '1.4',
          }}
        >
          <div>🟢 WPA3 • 🔵 WPA2 • 🔴 OPEN</div>
        </div>
      </div>
    );
  };

  const renderCard = (card: CardState) => {
    const width = `${card.w}%`;
    const left = `${card.x}%`;

    return (
      <div
        key={card.id}
        style={{
          position: 'absolute',
          left,
          top: `${card.y}px`,
          width,
          height: `${card.h}px`,
          transition: dragging === card.id || resizing === card.id ? 'none' : 'box-shadow 0.2s',
        }}
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 rounded-xl shadow-lg hover:shadow-xl transition-shadow group flex flex-col backdrop-blur-sm"
      >
        <div
          className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700/70 flex-shrink-0 cursor-grab active:cursor-grabbing rounded-t-xl"
          onMouseDown={(e) => handleMouseDown(e, card.id, 'move')}
        >
          <div className="flex items-center gap-2">
            <NetworkIcon size={18} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">{card.title}</h3>
          </div>
          <GripHorizontal
            size={16}
            className="text-slate-500 group-hover:text-slate-300 transition-colors"
          />
        </div>

        {card.type === 'map' && (
          <div className="flex-1 p-4 overflow-hidden">{renderMapMarkers()}</div>
        )}

        {card.type === 'networks' && (
          <>
            <div className="flex flex-col gap-2 p-3 bg-slate-900/80 border-b border-slate-700/70 flex-shrink-0 rounded-b-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <NetworkIcon size={16} className="text-blue-400" />
                  <span className="text-sm font-semibold text-white">Networks Explorer</span>
                  <span className="text-xs text-slate-400">Latest snapshot</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                    Rows {filteredNetworks.length}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                    Selected {selectedNetworks.size}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                    Observations {observationCount}
                  </span>
                  {usingFallback && (
                    <span className="px-2 py-1 rounded bg-amber-900/40 border border-amber-700 text-amber-200">
                      Fallback data (API error)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <SearchIcon size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SSID or BSSID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <div className="relative" ref={columnDropdownRef}>
                  <button
                    onClick={() => setShowColumnSelector((v) => !v)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    <SettingsIcon size={16} className="text-slate-400" />
                  </button>
                  {showColumnSelector && (
                    <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <div className="p-2 border-b border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-semibold text-white">Columns</span>
                        <button
                          onClick={resetColumns}
                          className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="p-2 max-h-80 overflow-y-auto space-y-1">
                        {Object.keys(NETWORK_COLUMNS).map((col) => (
                          <label
                            key={col}
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 p-1 rounded text-xs text-white"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(col as keyof NetworkRow | 'select')}
                              onChange={() => toggleColumn(col as keyof NetworkRow | 'select')}
                              className="cursor-pointer"
                            />
                            {NETWORK_COLUMNS[col as keyof typeof NETWORK_COLUMNS].label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto text-xs">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900/90 border-b border-slate-700/70 backdrop-blur">
                  <tr>
                    {visibleColumns.map((col) => {
                      const column = NETWORK_COLUMNS[col];
                      const sortIdx = sort.findIndex((s) => s.column === col);
                      return (
                        <th
                          key={col}
                          style={{ width: column.width, minWidth: column.width }}
                          className={`p-2 text-left text-blue-400 font-semibold ${
                            column.sortable ? 'cursor-pointer hover:bg-slate-800' : ''
                          }`}
                          onClick={(e) =>
                            column.sortable && handleSort(col as keyof NetworkRow, e.shiftKey)
                          }
                        >
                          <div className="flex items-center gap-1">
                            <span>{column.label}</span>
                            {sortIdx > -1 && (
                              <span className="text-yellow-400 text-xs">
                                {sort[sortIdx].direction === 'asc' ? '▲' : '▼'}
                                {sort.length > 1 ? ` ${sortIdx + 1}` : ''}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {loadingNetworks && (
                    <tr>
                      <td
                        colSpan={visibleColumns.length}
                        className="p-3 text-center text-slate-400"
                      >
                        Loading networks…
                      </td>
                    </tr>
                  )}
                  {!loadingNetworks && filteredNetworks.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleColumns.length}
                        className="p-3 text-center text-slate-400"
                      >
                        No networks found
                      </td>
                    </tr>
                  )}
                  {!loadingNetworks &&
                    filteredNetworks.map((net, idx) => (
                      <tr
                        key={net._rowKey || `${net.bssid}-${idx}`}
                        className={`border-b border-slate-700 hover:bg-slate-700 hover:bg-opacity-40 transition-colors h-8 ${
                          selectedNetworks.has(net.bssid) ? 'bg-blue-900 bg-opacity-30' : ''
                        }`}
                        onMouseEnter={() => setHoveredNetwork(net.bssid)}
                        onMouseLeave={() => setHoveredNetwork(null)}
                        onClick={() => toggleSelectNetwork(net.bssid)}
                      >
                        {visibleColumns.map((col) => {
                          const column = NETWORK_COLUMNS[col];
                          const value = net[col as keyof NetworkRow];
                          let content: React.ReactNode = value ?? 'N/A';

                          if (col === 'select') {
                            return (
                              <td key={col} style={{ width: column.width }} className="p-1">
                                <input
                                  type="checkbox"
                                  checked={selectedNetworks.has(net.bssid)}
                                  onChange={() => toggleSelectNetwork(net.bssid)}
                                  className="cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                            );
                          }
                          if (col === 'type') {
                            content = <TypeBadge type={(value as NetworkRow['type']) || 'W'} />;
                          } else if (col === 'signal') {
                            const signalValue = value as number | null;
                            let color = '#6b7280';
                            if (signalValue != null) {
                              if (signalValue >= -50) color = '#10b981';
                              else if (signalValue >= -70) color = '#f59e0b';
                              else color = '#ef4444';
                            }
                            content = (
                              <span style={{ color, fontWeight: 600 }}>
                                {signalValue != null ? `${signalValue} dBm` : 'N/A'}
                              </span>
                            );
                          } else if (col === 'frequency') {
                            content =
                              value == null ? 'N/A' : `${parseFloat(String(value)).toFixed(3)} GHz`;
                          } else if (col === 'distanceFromHome') {
                            content =
                              value == null ? 'N/A' : `${parseFloat(String(value)).toFixed(2)} km`;
                          } else if (col === 'accuracy') {
                            content =
                              value == null ? 'N/A' : `${parseFloat(String(value)).toFixed(1)} m`;
                          } else if (col === 'observations') {
                            content = (
                              <span className="bg-blue-900 bg-opacity-40 text-blue-300 px-2 py-1 rounded text-xs font-semibold border border-blue-500 border-opacity-30">
                                {value as number}
                              </span>
                            );
                          }

                          return (
                            <td
                              key={col}
                              style={{ width: column.width, minWidth: column.width }}
                              className={`p-1 truncate ${col === 'bssid' ? 'font-mono text-slate-400' : 'text-white'}`}
                            >
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-2 bg-slate-900/80 border-t border-slate-700/70 text-xs text-slate-300 flex-shrink-0 flex items-center justify-between rounded-b-xl">
              <div className="flex items-center gap-3">
                <span>Visible: {filteredNetworks.length}</span>
                <span>Selected: {selectedNetworks.size}</span>
                <span>Observations: {observationCount}</span>
                {usingFallback && (
                  <span className="px-2 py-1 rounded bg-amber-900/40 border border-amber-700 text-amber-200">
                    Fallback data (API error)
                  </span>
                )}
              </div>
              <div className="text-slate-400">
                {loadingNetworks
                  ? 'Loading networks…'
                  : loadingObservations
                    ? 'Loading observations…'
                    : selectedNetworks.size > 0 && observationCount === 0
                      ? 'No observations for selection'
                      : 'Ready'}
              </div>
            </div>
          </>
        )}

        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, card.id, 'resize');
          }}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.4) 50%)',
            borderRadius: '0 0 8px 0',
          }}
        />
      </div>
    );
  };

  return (
    <div
      className="relative w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden p-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          position: 'relative',
          height: 'calc(100vh - 2rem)',
        }}
      >
        {cards.map((card) => renderCard(card))}
      </div>
    </div>
  );
}
