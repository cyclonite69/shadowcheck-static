import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { apiClient } from '../../api/client';

interface CandidateObservation {
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

interface VisIntResult {
  status: 'MATCHED' | 'UNMATCHED';
  observation_id: string | null;
  detection_score: number;
  dist_meters: number | null;
  delta_minutes: number | null;
  tags_applied: string[];
  exif: { lat: number; lon: number; ts: string };
  candidates?: CandidateObservation[];
}

const VISINT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const VISINT_UPLOAD_MAX_MB = VISINT_UPLOAD_MAX_BYTES / (1024 * 1024);

const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const apiError = err as {
    message?: string;
    data?: { error?: unknown; message?: unknown };
    response?: { data?: { error?: unknown; message?: unknown } };
  };
  const rawMessage =
    apiError.response?.data?.error ||
    apiError.response?.data?.message ||
    apiError.data?.error ||
    apiError.data?.message ||
    apiError.message ||
    fallback;

  return typeof rawMessage === 'string' ? rawMessage : fallback;
};

export default function VisIntUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisIntResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  // Interaction Flow State
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveTags, setSaveTags] = useState<string[]>([]);

  // Custom Search Bounds
  const [radiusMeters, setRadiusMeters] = useState<number>(50);
  const [windowHours, setWindowHours] = useState<number>(2);
  const [limit, setLimit] = useState<number>(5);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearCorrelationState = () => {
    setResult(null);
    setSelectedCandidateId(null);
    setSaveSuccess(false);
    setSaveTags([]);
  };

  const clearSelectedImageState = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    clearCorrelationState();
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      clearSelectedImageState();
      setError('Please select a valid image file (JPEG or PNG).');
      setErrorType(null);
      return;
    }
    if (file.size > VISINT_UPLOAD_MAX_BYTES) {
      clearSelectedImageState();
      setError(`VISINT images must be ${VISINT_UPLOAD_MAX_MB} MB or smaller.`);
      setErrorType('PayloadTooLarge');
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    clearCorrelationState();
    setError(null);
    setErrorType(null);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setErrorType(null);
    setSaveSuccess(false);
    setSaveTags([]);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('filename', selectedFile.name);
      formData.append('commit', 'false');
      formData.append('radius_meters', String(radiusMeters));
      formData.append('window_hours', String(windowHours));
      formData.append('limit', String(limit));

      const response = await apiClient.post<{ ok: boolean } & VisIntResult>(
        '/observations/correlate-visint',
        formData
      );

      setResult(response);

      // Auto-select the best candidate match (first in list) if it exists, otherwise fallback to unmatched
      if (response.candidates && response.candidates.length > 0) {
        setSelectedCandidateId(String(response.candidates[0].id));
      } else {
        setSelectedCandidateId('unmatched');
      }
    } catch (err: any) {
      console.error(err);
      setError(getApiErrorMessage(err, 'An error occurred during upload.'));
      if (
        err.response?.data?.type === 'ExifMissingError' ||
        err.data?.type === 'ExifMissingError'
      ) {
        setErrorType('ExifMissingError');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveCorrelation = async () => {
    if (!selectedFile || !result || !selectedCandidateId) return;

    setSaveLoading(true);
    setError(null);

    try {
      const isUnmatched = selectedCandidateId === 'unmatched';
      const candidate = result.candidates?.find((c) => String(c.id) === selectedCandidateId);
      // manual_override = true when the user picked a different candidate than the scorer's auto-top-pick
      const autoTopId = result.candidates?.[0] ? String(result.candidates[0].id) : null;
      const isManualOverride = !isUnmatched && selectedCandidateId !== autoTopId;

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('filename', selectedFile.name);
      formData.append(
        'bssid',
        isUnmatched ? 'VISINT_UNMATCHED' : candidate?.bssid || 'VISINT_UNMATCHED'
      );
      formData.append('status', isUnmatched ? 'UNMATCHED' : 'MATCHED');
      formData.append(
        'detection_score',
        String(isUnmatched ? 0 : Number(candidate?.detection_score || 0))
      );
      formData.append('manual_override', String(isManualOverride));
      if (candidate?.device_type) {
        formData.append('device_type', candidate.device_type);
      }
      if (!isUnmatched) {
        formData.append('dist_meters', String(Number(candidate?.dist_meters || 0)));
        formData.append('delta_minutes', String(Number(candidate?.delta_minutes || 0)));
      }
      formData.append('lat', String(result.exif.lat));
      formData.append('lon', String(result.exif.lon));
      formData.append('ts', result.exif.ts);

      const response = await apiClient.post<{
        ok: boolean;
        success: boolean;
        tags_applied: string[];
      }>('/observations/attach-visint', formData);

      if (response.success) {
        setSaveSuccess(true);
        setSaveTags(response.tags_applied);
      }
    } catch (err: any) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to save correlation.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const getPreviewTags = () => {
    if (!result || !selectedCandidateId) return [];

    const isUnmatched = selectedCandidateId === 'unmatched';
    const candidate = result.candidates?.find((c) => String(c.id) === selectedCandidateId);
    const autoTopId = result.candidates?.[0] ? String(result.candidates[0].id) : null;
    const isManualOverride = !isUnmatched && selectedCandidateId !== autoTopId;
    const bssid = isUnmatched ? 'VISINT_UNMATCHED' : candidate?.bssid || 'VISINT_UNMATCHED';
    const score = Number(candidate?.detection_score || 0);
    const deviceType: string | null = candidate?.device_type || null;

    // Mirrors server-side deriveVisintTags logic
    if (bssid === 'VISINT_UNMATCHED') {
      return ['UNMATCHED_NODE', 'VISINT_UNMATCHED'];
    }

    if (isManualOverride) {
      const tags = [
        'VISINT_SPATIAL_MATCH',
        'VISINT_MANUAL_MATCH',
        'VISINT_CONFIRMED',
        'GROUND_TRUTH_IMAGE',
      ];
      if (deviceType === 'SHOTSPOTTER_SENSOR') {
        tags.push('SHOTSPOTTER_SENSOR');
      } else if (deviceType === 'FLOCK_SAFETY_CAMERA') {
        tags.push(
          score >= 4 ? 'FLOCK_NEW_FIRMWARE' : score >= 3 ? 'FLOCK_LEGACY' : 'FLOCK_CANDIDATE'
        );
      }
      return tags;
    }

    if (deviceType === 'SHOTSPOTTER_SENSOR') {
      return score >= 2
        ? ['SHOTSPOTTER_SENSOR', 'VISINT_VERIFIED']
        : ['SHOTSPOTTER_SENSOR', 'VISINT_PENDING'];
    }

    if (deviceType === 'FLOCK_SAFETY_CAMERA') {
      if (score >= 4) return ['FLOCK_NEW_FIRMWARE', 'VISINT_VERIFIED'];
      if (score >= 3) return ['FLOCK_LEGACY', 'VISINT_VERIFIED'];
      if (score >= 1) return ['FLOCK_CANDIDATE', 'VISINT_PENDING'];
    }

    if (score >= 1) return ['VISINT_PENDING'];
    return ['VISINT_SPATIAL_MATCH'];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedBssid =
    selectedCandidateId === 'unmatched'
      ? 'VISINT_UNMATCHED'
      : result?.candidates?.find((c) => String(c.id) === selectedCandidateId)?.bssid ||
        'VISINT_UNMATCHED';

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 text-slate-100 shadow-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          VisINT Auto-Correlation Pipeline
        </h2>
        <p className="text-sm text-slate-400">
          Upload tactical SIGINT images to extract EXIF telemetry and execute spatial-temporal
          correlation queries against core observations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={triggerFileInput}
            className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-cyan-500 bg-cyan-950/20'
                : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileInputChange}
              accept="image/jpeg,image/png"
              className="hidden"
            />
            {previewUrl ? (
              <div className="relative w-full h-full p-3 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Telemetry upload preview"
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 p-6 text-center">
                <div className="p-3 bg-slate-800/80 rounded-full text-slate-400">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-300">
                  Drag and drop tactical image, or <span className="text-cyan-400">browse</span>
                </div>
                <div className="text-xs text-slate-500">
                  Supports JPEG and PNG images up to {VISINT_UPLOAD_MAX_MB}MB
                </div>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                <div
                  className="truncate font-mono text-slate-300 max-w-[200px]"
                  title={selectedFile.name}
                >
                  {selectedFile.name}
                </div>
                <div className="text-slate-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearSelectedImageState();
                    setError(null);
                    setErrorType(null);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear
                </button>
              </div>

              {!result && (
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <span>Search Parameter Tuning</span>
                    <span className="text-[10px]">{showSettings ? '▲' : '▼'}</span>
                  </button>

                  {showSettings && (
                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                      <div>
                        <label
                          htmlFor="radius-input"
                          className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1"
                        >
                          Spatial Radius: {radiusMeters} meters
                        </label>
                        <input
                          id="radius-input"
                          type="range"
                          min="10"
                          max="1000"
                          step="10"
                          value={radiusMeters}
                          onChange={(e) => setRadiusMeters(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="hours-input"
                          className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1"
                        >
                          Temporal Window: ±{windowHours} hours
                        </label>
                        <input
                          id="hours-input"
                          type="range"
                          min="1"
                          max="168"
                          step="1"
                          value={windowHours}
                          onChange={(e) => setWindowHours(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="limit-input"
                          className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1"
                        >
                          Max Candidates (X): {limit}
                        </label>
                        <input
                          id="limit-input"
                          type="range"
                          min="1"
                          max="50"
                          step="1"
                          value={limit}
                          onChange={(e) => setLimit(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result && (
                <button
                  type="button"
                  onClick={uploadFile}
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Analyzing Telemetry...</span>
                    </div>
                  ) : (
                    <span>Search Matching Observations</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 flex flex-col justify-start">
          {error && (
            <div
              className={`p-4 rounded-xl border flex flex-col space-y-2 mb-4 ${
                errorType === 'ExifMissingError'
                  ? 'bg-amber-950/20 border-amber-900/60 text-amber-200'
                  : 'bg-red-950/20 border-red-900/60 text-red-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-semibold text-sm">
                  {errorType === 'ExifMissingError'
                    ? 'Telemetry Payload Rejected'
                    : 'Pipeline Error'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{error}</p>
            </div>
          )}

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-64 border border-slate-800/80 rounded-xl bg-slate-950/20 text-slate-500">
              <svg
                className="w-12 h-12 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <div className="text-sm font-semibold">Ready for Telemetry Payload</div>
              <div className="text-xs mt-1">
                Upload a tactical capture to search corresponding physical observations.
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 border border-slate-800/80 rounded-xl bg-slate-950/20 text-slate-400">
              <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 animate-spin" />
              </div>
              <div className="text-sm font-semibold">Processing Pipeline</div>
              <div className="text-xs text-slate-500 mt-1">
                Executing exiftool & performing spatial-temporal casts
              </div>
            </div>
          )}

          {result && saveSuccess && (
            <div className="flex flex-col space-y-4 p-5 rounded-xl border border-emerald-800/60 bg-emerald-950/10 text-slate-200">
              <div className="flex items-center space-x-2 border-b border-emerald-900/50 pb-3">
                <svg
                  className="w-6 h-6 text-emerald-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-bold text-white text-md">Correlation Completed & Saved</span>
              </div>

              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  Image attachment has been linked to BSSID:{' '}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedBssid)}
                    className="font-mono text-cyan-300 hover:text-cyan-200 cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1.5 font-bold"
                    title="Click to copy BSSID"
                  >
                    {selectedBssid}
                    <span className="text-[10px] text-slate-500 font-sans font-normal">
                      {copied ? '(Copied!)' : '(Copy)'}
                    </span>
                  </button>
                </p>
                {selectedCandidateId !== 'unmatched' && (
                  <p className="flex items-center gap-2">
                    Matched Observation ID:{' '}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(selectedCandidateId))}
                      className="font-mono text-slate-300 hover:text-slate-200 cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1.5 font-bold"
                      title="Click to copy Observation ID"
                    >
                      {selectedCandidateId}
                      <span className="text-[10px] text-slate-500 font-sans font-normal">
                        {copied ? '(Copied!)' : '(Copy)'}
                      </span>
                    </button>
                  </p>
                )}
                <div>
                  <div className="text-xs text-slate-400 mt-2 mb-1 uppercase tracking-wider font-semibold">
                    Tags Applied:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {saveTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearSelectedImageState();
                  setError(null);
                  setErrorType(null);
                }}
                className="mt-4 px-4 py-2 border border-emerald-800 hover:bg-emerald-950/30 text-emerald-300 hover:text-emerald-200 rounded-lg text-xs font-semibold transition-all text-center"
              >
                Reset & Correlate Another Image
              </button>
            </div>
          )}

          {result && !saveSuccess && (
            <div className="flex flex-col space-y-4 p-5 rounded-xl border border-slate-800 bg-slate-950/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-semibold text-white">Pipeline Summary</span>
                <span className="text-xs font-semibold text-cyan-400">
                  {result.candidates?.length || 0} candidate(s) found
                </span>
              </div>

              {/* EXIF Data */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    EXIF Latitude
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {result.exif.lat.toFixed(6)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    EXIF Longitude
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {result.exif.lon.toFixed(6)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    EXIF Timestamp
                  </span>
                  <span
                    className="text-[11px] font-mono font-semibold text-slate-300 truncate"
                    title={result.exif.ts}
                  >
                    {result.exif.ts}
                  </span>
                </div>
              </div>

              {/* Candidates Selection Table */}
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
                      {result.candidates && result.candidates.length > 0 ? (
                        result.candidates.map((c) => (
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
                          <div className="font-semibold text-slate-300">
                            Unmatched Telemetry Fallback
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Attach to dummy BSSID: VISINT_UNMATCHED
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Commit Summary */}
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg flex flex-col space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Correlation preview
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {selectedCandidateId === 'unmatched' ? (
                    <span>
                      Photo will be logged as unmatched telemetry. It will attach to fallback BSSID{' '}
                      <strong className="font-mono text-amber-400">VISINT_UNMATCHED</strong> and be
                      tagged with:
                    </span>
                  ) : (
                    <span>
                      Photo will be attached to BSSID:{' '}
                      <strong className="font-mono text-cyan-300">{selectedBssid}</strong> and be
                      tagged with:
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {getPreviewTags().map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono font-bold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={saveCorrelation}
                disabled={saveLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold transition-all duration-200 text-sm shadow-md"
              >
                {saveLoading ? 'Saving Correlation...' : 'Confirm & Save Correlation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
