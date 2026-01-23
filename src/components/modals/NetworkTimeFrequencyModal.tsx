import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface NetworkTimeFrequencyModalProps {
  bssid: string;
  ssid: string;
  onClose: () => void;
}

const NetworkTimeFrequencyModal: React.FC<NetworkTimeFrequencyModalProps> = ({
  bssid,
  ssid,
  onClose,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    ch: number;
    time: number;
    data: { type: string; power: number; signal: number; freq: number } | null;
  } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Set up portal container on mount, prevent background scroll
  useEffect(() => {
    let container = document.getElementById('modal-root');
    let created = false;
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-root';
      document.body.appendChild(container);
      created = true;
    }
    setPortalContainer(container);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      if (created && container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  const generateGrid = () => {
    const timeSlots = 50;
    let channels = 40; // Default BLE

    // Simulate device type based on BSSID
    const deviceType = bssid.includes('a')
      ? 'WiFi-5GHz'
      : bssid.includes('b')
        ? 'WiFi-2.4GHz'
        : 'BLE';

    if (deviceType === 'WiFi-5GHz') channels = 200;
    else if (deviceType === 'WiFi-2.4GHz') channels = 14;

    const grid: (null | {
      type: string;
      color: string;
      power: number;
      signal: number;
      freq: number;
    })[][] = Array(channels)
      .fill(null)
      .map(() => Array(timeSlots).fill(null));

    // Generate simulated data
    for (let i = 0; i < 100; i++) {
      const timeIdx = Math.floor(Math.random() * timeSlots);
      const chIdx = Math.floor(Math.random() * channels);
      const signalStrength = Math.random();

      grid[chIdx][timeIdx] = {
        type: deviceType.includes('WiFi') ? 'WIFI' : 'BLE',
        power: Math.max(0.3, Math.min(1, signalStrength)),
        signal: -30 - Math.random() * 70,
        freq: deviceType === 'WiFi-5GHz' ? 5000 + Math.random() * 1000 : 2400 + Math.random() * 100,
      };
    }

    return { grid, channels, timeSlots, deviceType };
  };

  const { grid, channels, timeSlots, deviceType } = generateGrid();
  const cellSize = 12;

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-freq-modal-title"
    >
      <div className="bg-slate-900 rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col min-h-0 overflow-hidden text-white shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-blue-400 text-xl" aria-hidden="true">
                📡
              </span>
              <h2 id="time-freq-modal-title" className="text-xl font-bold">
                Time-Frequency Grid
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              {ssid || '(Hidden SSID)'} • {bssid} • Type: {deviceType}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            title="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl bg-transparent border-none cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-1 min-h-0 gap-6">
          {/* Legend */}
          <div className="bg-slate-800 rounded-lg p-4 shrink-0">
            <div className="flex gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" aria-hidden="true"></div>
                <span>WiFi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" aria-hidden="true"></div>
                <span>BLE</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 bg-slate-700 border border-slate-600 rounded"
                  aria-hidden="true"
                ></div>
                <span>Idle</span>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="bg-slate-800 rounded-lg p-6 flex-1 min-h-0 overflow-auto">
            <div className="flex gap-4 items-start">
              {/* Y-axis */}
              <div
                className="flex flex-col justify-between text-right shrink-0"
                style={{ height: channels * cellSize }}
                aria-hidden="true"
              >
                {[
                  channels - 1,
                  Math.floor((channels * 3) / 4),
                  Math.floor(channels / 2),
                  Math.floor(channels / 4),
                  0,
                ].map((ch) => (
                  <div key={ch} className="text-xs text-slate-400">
                    {deviceType === 'BLE' ? `Ch ${ch}` : `${2400 + ch * 5}MHz`}
                  </div>
                ))}
              </div>

              {/* Grid SVG */}
              <div className="shrink-0">
                <div className="mb-2 text-xs text-slate-400 text-center" aria-hidden="true">
                  Time →
                </div>
                <svg
                  width={timeSlots * cellSize}
                  height={channels * cellSize}
                  role="img"
                  aria-label={`Time-frequency grid showing ${channels} channels over ${timeSlots} time slots`}
                >
                  {grid.map((row, chIdx) =>
                    row.map((cell, timeIdx) => {
                      const isHovered = hoveredCell?.ch === chIdx && hoveredCell?.time === timeIdx;
                      const cellFillClass = cell
                        ? cell.type === 'WIFI'
                          ? 'fill-blue-500'
                          : 'fill-emerald-500'
                        : 'fill-slate-800';
                      return (
                        <g key={`${chIdx}-${timeIdx}`}>
                          <rect
                            x={timeIdx * cellSize}
                            y={chIdx * cellSize}
                            width={cellSize}
                            height={cellSize}
                            className={`${cellFillClass} stroke-slate-950 stroke-[0.5] cursor-pointer transition-opacity`}
                            opacity={cell ? cell.power : 0.3}
                            onMouseEnter={() =>
                              setHoveredCell({ ch: chIdx, time: timeIdx, data: cell })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                          {isHovered && (
                            <rect
                              x={timeIdx * cellSize}
                              y={chIdx * cellSize}
                              width={cellSize}
                              height={cellSize}
                              fill="none"
                              className="stroke-white stroke-[2]"
                            />
                          )}
                        </g>
                      );
                    })
                  )}
                </svg>
                <div
                  className="flex justify-between mt-2"
                  style={{ width: timeSlots * cellSize }}
                  aria-hidden="true"
                >
                  <span className="text-xs text-slate-400">0</span>
                  <span className="text-xs text-slate-400">{Math.floor(timeSlots / 2)}</span>
                  <span className="text-xs text-slate-400">{timeSlots}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hover info */}
          {hoveredCell?.data && (
            <div className="bg-slate-800 rounded-lg p-4 text-sm shrink-0" aria-live="polite">
              <div className="font-semibold text-white mb-2">Cell Information:</div>
              <div className="text-slate-300 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-slate-400">Channel:</span> {hoveredCell.ch}
                </div>
                <div>
                  <span className="text-slate-400">Time Slot:</span> {hoveredCell.time}
                </div>
                <div>
                  <span className="text-slate-400">Type:</span> {hoveredCell.data.type}
                </div>
                <div>
                  <span className="text-slate-400">Signal:</span>{' '}
                  {hoveredCell.data.signal.toFixed(1)} dBm
                </div>
                <div>
                  <span className="text-slate-400">Frequency:</span>{' '}
                  {hoveredCell.data.freq.toFixed(1)} MHz
                </div>
                <div>
                  <span className="text-slate-400">Power:</span>{' '}
                  {(hoveredCell.data.power * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Wait for portal container before rendering
  if (!portalContainer) {
    return null;
  }

  return createPortal(modalContent, portalContainer);
};

export default NetworkTimeFrequencyModal;
