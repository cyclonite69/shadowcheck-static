import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { apiClient } from '../../api/client';

interface VisIntResult {
  status: 'MATCHED' | 'UNMATCHED';
  observation_id: string | null;
  detection_score: number;
  dist_meters: number | null;
  delta_minutes: number | null;
  tags_applied: string[];
  exif: { lat: number; lon: number; ts: string };
}

export default function VisIntUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisIntResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG or PNG).');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
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

    try {
      const reader = new FileReader();

      // Wrap FileReader in a promise
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const resultStr = reader.result as string;
          // Extract the base64 part
          const base64 = resultStr.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(selectedFile);
      });

      const response = await apiClient.post<{ ok: boolean } & VisIntResult>(
        '/api/observations/correlate-visint',
        {
          image: base64Data,
          filename: selectedFile.name,
        }
      );

      setResult(response);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'An error occurred during upload.');
      if (err.response?.data?.type === 'ExifMissingError') {
        setErrorType('ExifMissingError');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 text-slate-100 shadow-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          VisINT Auto-Correlation Pipeline
        </h2>
        <p className="text-sm text-slate-400">
          Upload tactical SIGINT images to extract EXIF telemetry and execute spatial-temporal
          correlation queries against core observations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Column */}
        <div className="flex flex-col space-y-6">
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
                  Supports JPEG and PNG images up to 20MB
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
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setResult(null);
                    setError(null);
                    setErrorType(null);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear
                </button>
              </div>

              <button
                type="button"
                onClick={uploadFile}
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center space-y-0 space-x-2">
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
                    <span>Extracting & Correlating...</span>
                  </div>
                ) : (
                  <span>Correlate VisINT Telemetry</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Results Column */}
        <div className="flex flex-col justify-start">
          {error && (
            <div
              className={`p-4 rounded-xl border flex flex-col space-y-2 ${
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
                    : 'Correlation Failed'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{error}</p>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="flex flex-col items-center justify-center h-full p-8 border border-slate-800/80 rounded-xl bg-slate-950/20 text-slate-500">
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
                Upload a tactical capture to launch auto-correlation
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full p-8 border border-slate-800/80 rounded-xl bg-slate-950/20 text-slate-400">
              <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 animate-spin" />
              </div>
              <div className="text-sm font-semibold">Processing Pipeline</div>
              <div className="text-xs text-slate-500 mt-1">
                Executing exiftool & performing spatial-temporal casts
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col space-y-4 p-5 rounded-xl border border-slate-800 bg-slate-950/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-semibold text-white">Pipeline Summary</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                    result.status === 'MATCHED'
                      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                      : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                  }`}
                >
                  {result.status}
                </span>
              </div>

              {/* EXIF Data */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    EXIF Latitude
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {result.exif.lat.toFixed(6)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    EXIF Longitude
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {result.exif.lon.toFixed(6)}
                  </span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    EXIF Timestamp
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {result.exif.ts}
                  </span>
                </div>
              </div>

              {/* Matched Stats */}
              {result.status === 'MATCHED' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Distance Delta
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {result.dist_meters} meters
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Time Delta
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {result.delta_minutes} minutes
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Observation ID
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-cyan-300 border border-slate-800 truncate">
                        {result.observation_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.observation_id || '')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-300 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <svg
                            className="w-3.5 h-3.5 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags Applied */}
              <div className="flex flex-col space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  Auto-Tags Imposed
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags_applied.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
