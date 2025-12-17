import React, { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    deck?: any;
    mapboxgl?: any;
  }
}

type NetworkData = {
  position: [number, number];
  bssid: string;
  ssid: string;
  signal: number;
  level: number;
  encryption: string;
  channel: number;
  frequency: number;
  manufacturer: string;
  device_type: string;
  type: string;
  capabilities: string;
  timestamp: string;
  last_seen: string;
};

type LayerType = 'scatterplot' | 'heatmap' | 'hexagon';
type DrawMode = 'none' | 'rectangle' | 'polygon' | 'circle';

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const loadCss = (href: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS ${href}`));
    document.head.appendChild(link);
  });

const KeplerTestPage: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const deckRef = useRef<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<NetworkData[]>([]);

  // Controls
  const [layerType, setLayerType] = useState<LayerType>('scatterplot');
  const [pointSize, setPointSize] = useState<number>(2);
  const [signalThreshold, setSignalThreshold] = useState<number>(-100);
  const [pitch, setPitch] = useState<number>(0);
  const [height3d, setHeight3d] = useState<number>(1);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [showDrawingPanel, setShowDrawingPanel] = useState<boolean>(false);

  const generateTooltip = useCallback((network: NetworkData) => {
    const radioType = interpretWigleType(network.type);
    const security = interpretSecurity(network.capabilities, network.encryption);
    const signalStrength = interpretSignalStrength(network.signal);
    const networkIcon = getNetworkIcon(network.type);

    return `
      <div style="background: rgba(15, 23, 42, 0.95); color: #f8fafc; padding: 15px; border-radius: 8px; max-width: 380px; font-size: 11px; border: 1px solid rgba(148, 163, 184, 0.2);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          ${networkIcon}
          <span style="color: #22d3ee; font-weight: bold; font-size: 15px;">${network.ssid}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <div><span style="color: #94a3b8; font-size: 10px;">BSSID</span><br><span style="font-family: monospace; font-size: 10px;">${network.bssid}</span></div>
          <div><span style="color: #94a3b8; font-size: 10px;">Signal</span><br><span style="color: ${signalStrength.color};">${network.signal} dBm (${signalStrength.text})</span></div>
          <div><span style="color: #94a3b8; font-size: 10px;">Channel</span><br>${network.channel}</div>
          <div><span style="color: #94a3b8; font-size: 10px;">Frequency</span><br>${network.frequency} MHz</div>
          <div><span style="color: #94a3b8; font-size: 10px;">Security</span><br><span style="color: ${security.color};">${security.text}</span></div>
          <div><span style="color: #94a3b8; font-size: 10px;">Level</span><br>${network.level}</div>
        </div>
        
        <div style="border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 8px; margin-bottom: 8px;">
          <div style="margin-bottom: 6px;"><span style="color: #94a3b8;">Radio Type:</span> <span style="color: #22d3ee;">${radioType.name}</span> <span style="color: #64748b; font-size: 10px;">(${radioType.code})</span></div>
          ${network.manufacturer !== 'Unknown' ? `<div style="margin-bottom: 6px;"><span style="color: #94a3b8;">Manufacturer:</span> ${network.manufacturer}</div>` : ''}
          ${network.device_type !== 'Unknown' ? `<div style="margin-bottom: 6px;"><span style="color: #94a3b8;">Device Type:</span> ${network.device_type}</div>` : ''}
          ${network.capabilities !== 'Unknown' ? `<div style="margin-bottom: 6px;"><span style="color: #94a3b8;">Capabilities:</span> <span style="font-family: monospace; font-size: 10px;">${network.capabilities}</span></div>` : ''}
        </div>
        
        <div style="border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 8px;">
          <div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Coordinates:</span> <span style="font-family: monospace; font-size: 10px;">${network.position[1].toFixed(6)}, ${network.position[0].toFixed(6)}</span></div>
          ${network.timestamp ? `<div style="margin-bottom: 4px;"><span style="color: #94a3b8;">First Seen:</span> <span style="color: #e2e8f0;">${new Date(network.timestamp).toLocaleString()}</span></div>` : ''}
          ${network.last_seen ? `<div><span style="color: #94a3b8;">Last Seen:</span> <span style="color: #e2e8f0;">${new Date(network.last_seen).toLocaleString()}</span></div>` : ''}
        </div>
      </div>
    `;
  }, []);

  const initDeck = useCallback(
    (token: string) => {
      if (!window.deck || !mapRef.current) return;

      const { DeckGL } = window.deck;
      deckRef.current = new DeckGL({
        container: mapRef.current,
        mapboxApiAccessToken: token,
        mapStyle: 'mapbox://styles/mapbox/dark-v11',
        initialViewState: {
          longitude: -83.6968,
          latitude: 43.0234,
          zoom: 10,
          pitch: pitch,
          bearing: 0,
          minZoom: 1,
          maxZoom: 24,
        },
        controller: drawMode === 'none',
        getTooltip: ({ object }: { object: any }) =>
          object && {
            html: generateTooltip(object),
            style: { backgroundColor: 'transparent', fontSize: '12px' },
          },
        onClick: ({ object }: { object: any }) => {
          if (object && !selectedPoints.find((p) => p.bssid === object.bssid)) {
            setSelectedPoints((prev) => [...prev, object]);
          }
        },
      });
    },
    [pitch, drawMode, generateTooltip, selectedPoints]
  );

  const updateVisualization = useCallback(() => {
    if (!deckRef.current || !window.deck) return;

    const filteredData = networkData.filter((d) => d.signal >= signalThreshold);
    let layer;

    if (layerType === 'scatterplot') {
      layer = new window.deck.ScatterplotLayer({
        id: 'networks',
        data: filteredData,
        getPosition: (d: NetworkData) => d.position,
        getRadius: pointSize * 10,
        getFillColor: (d: NetworkData) => {
          if (d.signal > -50) return [255, 0, 0, 180];
          if (d.signal > -70) return [255, 255, 0, 180];
          return [0, 255, 0, 180];
        },
        pickable: true,
        radiusMinPixels: 2,
        radiusMaxPixels: 50,
      });
    } else if (layerType === 'heatmap') {
      layer = new window.deck.HeatmapLayer({
        id: 'networks-heatmap',
        data: filteredData,
        getPosition: (d: NetworkData) => d.position,
        getWeight: (d: NetworkData) => Math.max(1, d.signal / 10),
        radiusPixels: 50,
      });
    } else if (layerType === 'hexagon') {
      layer = new window.deck.HexagonLayer({
        id: 'networks-hexagon',
        data: filteredData,
        getPosition: (d: NetworkData) => d.position,
        radius: 200,
        elevationScale: 4,
        extruded: true,
        pickable: true,
        getFillColor: [255, 140, 0, 180],
      });
    }

    deckRef.current.setProps({ layers: [layer] });
  }, [networkData, layerType, pointSize, signalThreshold]);

  const update3D = useCallback(() => {
    if (!deckRef.current) return;

    deckRef.current.setProps({
      initialViewState: {
        longitude: -83.6968,
        latitude: 43.0234,
        zoom: 10,
        pitch: pitch,
        bearing: 0,
      },
    });
  }, [pitch]);

  const clearSelection = useCallback(() => {
    setSelectedPoints([]);
  }, []);

  useEffect(() => {
    const setup = async () => {
      try {
        setLoading(true);

        // Load external dependencies
        await Promise.all([
          loadCss('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'),
          loadScript('https://cdn.jsdelivr.net/npm/deck.gl@8.9.0/dist.min.js'),
          loadScript('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'),
        ]);

        // Get token and data
        const [tokenRes, dataRes] = await Promise.all([
          fetch('/api/mapbox-token'),
          fetch('/api/kepler/observations'),
        ]);

        const tokenData = await tokenRes.json();
        const geojson = await dataRes.json();

        if (geojson.error) throw new Error(`API Error: ${geojson.error}`);
        if (!geojson.features || !Array.isArray(geojson.features))
          throw new Error(`Invalid data format`);
        if (geojson.features.length === 0) throw new Error('No network data found');

        const processedData: NetworkData[] = geojson.features.map((f: any) => ({
          position: f.geometry.coordinates,
          bssid: f.properties.bssid,
          ssid: f.properties.ssid,
          signal: f.properties.bestlevel || 0,
          level: f.properties.bestlevel || 0,
          encryption: f.properties.encryption,
          channel: f.properties.channel,
          frequency: f.properties.frequency,
          manufacturer: f.properties.manufacturer,
          device_type: f.properties.device_type,
          type: f.properties.type,
          capabilities: f.properties.capabilities,
          timestamp: f.properties.first_seen,
          last_seen: f.properties.last_seen,
        }));

        setNetworkData(processedData);
        initDeck(tokenData.token);
        setLoading(false);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err?.message || 'Failed to initialize visualization');
        setLoading(false);
      }
    };

    setup();
  }, [initDeck]);

  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  useEffect(() => {
    update3D();
  }, [update3D]);

  const filteredCount = networkData.filter((d) => d.signal >= signalThreshold).length;

  return (
    <div className="min-h-screen text-white relative bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-50">
          <div className="px-4 py-3 bg-slate-800 rounded-lg border border-slate-700">
            Loading network data…
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900 text-red-100 px-4 py-2 rounded-lg border border-red-700 z-50">
          {error}
        </div>
      )}

      <div ref={mapRef} className="w-full h-screen" />

      {/* Controls Panel */}
      <div className="absolute top-4 left-4 z-40 bg-black/80 text-white p-4 rounded-lg max-w-xs space-y-3 text-sm">
        <h3 className="text-lg font-semibold">🛡️ ShadowCheck Networks</h3>

        <div>
          <label className="block mb-1 text-xs text-slate-300">Dataset:</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs">
            <option value="observations">Observations (416K raw)</option>
            <option value="networks">Networks (117K trilaterated)</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-xs text-slate-300">3D View - Pitch: {pitch}°</label>
          <input
            type="range"
            min="0"
            max="60"
            value={pitch}
            onChange={(e) => setPitch(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-slate-300">3D Height: {height3d}</label>
          <input
            type="range"
            min="1"
            max="50"
            value={height3d}
            onChange={(e) => setHeight3d(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-slate-300">Visualization Type:</label>
          <select
            value={layerType}
            onChange={(e) => setLayerType(e.target.value as LayerType)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
          >
            <option value="scatterplot">Points</option>
            <option value="heatmap">Heatmap</option>
            <option value="hexagon">Hexagon Clusters</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-xs text-slate-300">Point Size: {pointSize}</label>
          <input
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={pointSize}
            onChange={(e) => setPointSize(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-slate-300">Drawing Mode:</label>
          <select
            value={drawMode}
            onChange={(e) => setDrawMode(e.target.value as DrawMode)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
          >
            <option value="none">None</option>
            <option value="rectangle">Rectangle Select</option>
            <option value="polygon">Polygon Select</option>
            <option value="circle">Circle Select</option>
          </select>
        </div>

        <button
          onClick={clearSelection}
          className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
        >
          Clear Selection
        </button>

        <div>
          <label className="block mb-1 text-xs text-slate-300">
            Signal Threshold: {signalThreshold} dBm
          </label>
          <input
            type="range"
            min="-100"
            max="-30"
            value={signalThreshold}
            onChange={(e) => setSignalThreshold(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="text-xs text-slate-400 pt-2 border-t border-slate-700">
          📊 {filteredCount.toLocaleString()} / {networkData.length.toLocaleString()} networks
          <br />
          🔥 FULL DATASET - GPU BEAST MODE
          <br />
          🎯 Selected: {selectedPoints.length} networks
          <br />
          📍 Interactive tooltips & selection
          <br />⚡ WebGL performance at scale
        </div>
      </div>
    </div>
  );
};

// Helper functions
function interpretWigleType(type: string) {
  const typeMap: Record<string, string> = {
    W: 'WiFi',
    E: 'BLE',
    B: 'Bluetooth',
    L: 'LTE',
    N: '5G NR',
    G: 'GSM',
  };
  if (!type || type === 'Unknown' || type === '') return { name: 'WiFi', code: 'W' };
  const typeCode = type.toString().toUpperCase();
  return { name: typeMap[typeCode] || typeCode || 'Unknown', code: typeCode };
}

function interpretSecurity(capabilities: string, encryption: string) {
  if (!capabilities || capabilities === 'Unknown') {
    if (encryption && encryption !== 'Open/Unknown') return { text: encryption, color: '#fbbf24' };
    return { text: 'Open', color: '#ef4444' };
  }
  if (capabilities.includes('WPA3')) return { text: 'WPA3 (Secure)', color: '#22c55e' };
  if (capabilities.includes('WPA2')) return { text: 'WPA2 (Secure)', color: '#22c55e' };
  if (capabilities.includes('WPA')) return { text: 'WPA (Weak)', color: '#f59e0b' };
  if (capabilities.includes('WEP')) return { text: 'WEP (Insecure)', color: '#ef4444' };
  return { text: 'Open', color: '#ef4444' };
}

function interpretSignalStrength(signal: number) {
  if (signal > -50) return { color: '#22c55e', text: 'Strong' };
  if (signal > -70) return { color: '#fbbf24', text: 'Medium' };
  return { color: '#ef4444', text: 'Weak' };
}

function getNetworkIcon(networkType: string) {
  const type = (networkType || 'wifi').toLowerCase();
  if (type.includes('ble') || type.includes('bluetooth') || type === 'b' || type === 'e') {
    return `<svg viewBox="0 0 24 24" fill="#22d3ee" width="16" height="16"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/></svg>`;
  }
  if (
    type.includes('cellular') ||
    type.includes('cell') ||
    type.includes('gsm') ||
    type.includes('lte') ||
    type.includes('5g') ||
    type === 'g' ||
    type === 'l' ||
    type === 'n'
  ) {
    return `<svg viewBox="0 0 24 24" fill="#22d3ee" width="16" height="16"><path d="M17.77 3.77L16 2 6 12l10 10 1.77-1.77L9.54 12z"/><path d="M6 12l10-10 1.77 1.77L9.54 12l8.23 8.23L16 22z"/><path d="M6 12l5-5v10z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="#22d3ee" width="16" height="16"><path d="M12 18.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/><path d="M12 14c-1.7 0-3.3.6-4.6 1.8a1 1 0 1 0 1.4 1.4A5 5 0 0 1 12 16a5 5 0 0 1 3.2 1.2 1 1 0 1 0 1.3-1.5A6.9 6.9 0 0 0 12 14z"/><path d="M12 9.5c-3 0-5.8 1.1-8 3.2a1 1 0 1 0 1.4 1.4c1.8-1.8 4.1-2.7 6.6-2.7 2.5 0 4.8.9 6.6 2.7a1 1 0 1 0 1.4-1.4c-2.2-2.1-5.1-3.2-8-3.2z"/><path d="M12 5c-4.3 0-8.3 1.6-11.3 4.6a1 1 0 1 0 1.4 1.4C4.6 7.5 8.2 6 12 6s7.4 1.5 9.9 4a1 1 0 1 0 1.4-1.4C20.3 6.6 16.3 5 12 5z"/></svg>`;
}

export default KeplerTestPage;
