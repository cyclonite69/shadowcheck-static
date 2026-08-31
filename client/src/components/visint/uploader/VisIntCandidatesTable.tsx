import React from 'react';

export interface CandidateObservation {
  id: string | number;
  bssid: string;
  ssid: string;
  radio_type: string;
  level: number;
  observed_at: string;
  lat: number;
  lon: number;
  dist_meters: string | number;
  delta_minutes: string | number;
  detection_score: string | number;
  device_type?: string | null;
  radio_service?: string;
}

export interface VisIntCandidatesTableProps {
  candidates?: CandidateObservation[];
  selectedCandidateId: string | null;
  setSelectedCandidateId: (id: string) => void;
}

export const VisIntCandidatesTable: React.FC<VisIntCandidatesTableProps> = ({
  candidates,
  selectedCandidateId,
  setSelectedCandidateId,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Select Observation Match to Attach
      </div>

      <div className="border border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
              <th className="p-2 w-8 text-center" aria-label="Select" />
              <th className="p-2">Score</th>
              <th className="p-2">Signal Detail</th>
              <th className="p-2 text-right">Distance</th>
              <th className="p-2 text-right">Time Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-900/10">
            {candidates && candidates.length > 0 ? (
              candidates.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCandidateId(String(c.id))}
                  className={`cursor-pointer hover:bg-slate-800/30 transition-colors ${
                    selectedCandidateId === String(c.id) ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  <td className="p-2 text-center">
                    <input
                      type="radio"
                      name="candidate-select"
                      checked={selectedCandidateId === String(c.id)}
                      onChange={() => setSelectedCandidateId(String(c.id))}
                      className="accent-cyan-500 h-3 w-3"
                    />
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        Number(c.detection_score) === 3
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/30'
                          : Number(c.detection_score) === 2
                            ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-900/30'
                            : Number(c.detection_score) === 1
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-900/30'
                              : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Lvl {c.detection_score}
                    </span>
                  </td>
                  <td className="p-2 font-mono">
                    <div className="text-slate-200 truncate font-semibold max-w-[180px]">
                      {c.ssid || '<Hidden SSID>'}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>{c.bssid}</span>
                      <span>•</span>
                      <span>Type: {c.radio_type}</span>
                      <span>•</span>
                      <span>Sig: {c.level}dBm</span>
                    </div>
                  </td>
                  <td className="p-2 text-right font-mono text-slate-300">
                    {Number(c.dist_meters).toFixed(1)}m
                  </td>
                  <td className="p-2 text-right font-mono text-slate-300">
                    {Number(c.delta_minutes).toFixed(1)}m
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500">
                  No observations found in space/time limits
                </td>
              </tr>
            )}

            {/* Unmatched Fallback Row */}
            <tr
              onClick={() => setSelectedCandidateId('unmatched')}
              className={`cursor-pointer hover:bg-slate-800/30 transition-colors ${
                selectedCandidateId === 'unmatched' ? 'bg-amber-950/20' : ''
              }`}
            >
              <td className="p-2 text-center">
                <input
                  type="radio"
                  name="candidate-select"
                  checked={selectedCandidateId === 'unmatched'}
                  onChange={() => setSelectedCandidateId('unmatched')}
                  className="accent-amber-500 h-3 w-3"
                />
              </td>
              <td className="p-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-900/30">
                  Lvl 0
                </span>
              </td>
              <td colSpan={3} className="p-2">
                <div className="font-semibold text-slate-300">Unmatched Telemetry Fallback</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Attach to dummy BSSID: VISINT_UNMATCHED
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
