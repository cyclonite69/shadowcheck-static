import React, { useEffect, useState } from 'react';
import { AdminCard } from '../components/AdminCard';
import { apiClient } from '../../../api/client';

const ClockIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ActivityIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const RefreshIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

interface JobConfig {
  enabled: boolean;
  cron: string;
  [key: string]: any;
}

type JobKey = 'backup' | 'mlScoring' | 'mvRefresh';
type ScheduleMode = 'hourly' | 'daily' | 'weekly';

interface ScheduleFormState {
  mode: ScheduleMode;
  time: string;
  intervalHours: string;
  dayOfWeek: string;
}

const JOB_SETTING_KEYS: Record<JobKey, string> = {
  backup: 'backup_job_config',
  mlScoring: 'ml_scoring_job_config',
  mvRefresh: 'mv_refresh_job_config',
};

const DEFAULT_CONFIGS: Record<JobKey, JobConfig> = {
  backup: { enabled: false, cron: '0 3 * * *', uploadToS3: true },
  mlScoring: { enabled: true, cron: '0 */4 * * *', limit: 10000 },
  mvRefresh: { enabled: true, cron: '30 4 * * *' },
};

const DEFAULT_SCHEDULES: Record<JobKey, ScheduleFormState> = {
  backup: { mode: 'daily', time: '03:00', intervalHours: '4', dayOfWeek: '1' },
  mlScoring: { mode: 'hourly', time: '00:00', intervalHours: '4', dayOfWeek: '1' },
  mvRefresh: { mode: 'daily', time: '04:30', intervalHours: '4', dayOfWeek: '1' },
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const INTERVAL_OPTIONS = ['1', '2', '3', '4', '6', '8', '12'];

function normalizeJobConfig(rawValue: unknown, fallback: JobConfig): JobConfig {
  let parsedValue = rawValue;
  if (typeof parsedValue === 'string') {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      return { ...fallback };
    }
  }

  if (!parsedValue || typeof parsedValue !== 'object') {
    return { ...fallback };
  }

  const candidate = parsedValue as Record<string, unknown>;
  return {
    ...fallback,
    ...candidate,
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
    cron:
      typeof candidate.cron === 'string' && candidate.cron.trim() ? candidate.cron : fallback.cron,
  };
}

function parseCronToSchedule(cron: string, fallback: ScheduleFormState): ScheduleFormState {
  const normalized = cron.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' ');
  if (parts.length !== 5) {
    return fallback;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (/^\*\/\d+$/.test(hour) && /^\d+$/.test(minute)) {
      const intervalHours = hour.slice(2);
      if (INTERVAL_OPTIONS.includes(intervalHours)) {
        return {
          mode: 'hourly',
          time: `${minute.padStart(2, '0')}:00`,
          intervalHours,
          dayOfWeek: fallback.dayOfWeek,
        };
      }
    }

    if (/^\d+$/.test(hour) && /^\d+$/.test(minute)) {
      return {
        mode: 'daily',
        time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
        intervalHours: fallback.intervalHours,
        dayOfWeek: fallback.dayOfWeek,
      };
    }
  }

  if (dayOfMonth === '*' && month === '*' && /^\d+$/.test(dayOfWeek)) {
    if (/^\d+$/.test(hour) && /^\d+$/.test(minute)) {
      return {
        mode: 'weekly',
        time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
        intervalHours: fallback.intervalHours,
        dayOfWeek,
      };
    }
  }

  return fallback;
}

function buildCronFromSchedule(schedule: ScheduleFormState): string {
  const [hours, minutes] = schedule.time.split(':');
  const minute = /^\d{2}$/.test(minutes || '') ? minutes : '00';
  const hour = /^\d{2}$/.test(hours || '') ? hours : '00';

  if (schedule.mode === 'hourly') {
    return `${Number.parseInt(minute, 10)} */${schedule.intervalHours} * * *`;
  }

  if (schedule.mode === 'weekly') {
    return `${Number.parseInt(minute, 10)} ${Number.parseInt(hour, 10)} * * ${schedule.dayOfWeek}`;
  }

  return `${Number.parseInt(minute, 10)} ${Number.parseInt(hour, 10)} * * *`;
}

function describeSchedule(schedule: ScheduleFormState): string {
  if (schedule.mode === 'hourly') {
    return `Runs every ${schedule.intervalHours} hour${schedule.intervalHours === '1' ? '' : 's'}`;
  }

  if (schedule.mode === 'weekly') {
    const day =
      WEEKDAY_OPTIONS.find((option) => option.value === schedule.dayOfWeek)?.label || 'day';
    return `Runs every ${day} at ${schedule.time}`;
  }

  return `Runs daily at ${schedule.time}`;
}

function JobScheduleEditor({
  accentClass,
  config,
  jobKey,
  onUpdate,
}: {
  accentClass: string;
  config: JobConfig;
  jobKey: JobKey;
  onUpdate: (field: string, value: any) => void;
}) {
  const schedule = parseCronToSchedule(config.cron, DEFAULT_SCHEDULES[jobKey]);

  const updateSchedule = (patch: Partial<ScheduleFormState>) => {
    const nextSchedule = { ...schedule, ...patch };
    onUpdate('cron', buildCronFromSchedule(nextSchedule));
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Schedule Type
        </label>
        <select
          value={schedule.mode}
          onChange={(e) => updateSchedule({ mode: e.target.value as ScheduleMode })}
          className={`w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 ${accentClass}`}
        >
          <option value="hourly">Every few hours</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {schedule.mode === 'hourly' ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Repeat Every
          </label>
          <select
            value={schedule.intervalHours}
            onChange={(e) => updateSchedule({ intervalHours: e.target.value })}
            className={`w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 ${accentClass}`}
          >
            {INTERVAL_OPTIONS.map((hours) => (
              <option key={hours} value={hours}>
                {hours} hour{hours === '1' ? '' : 's'}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {schedule.mode === 'weekly' ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Day of Week
          </label>
          <select
            value={schedule.dayOfWeek}
            onChange={(e) => updateSchedule({ dayOfWeek: e.target.value })}
            className={`w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 ${accentClass}`}
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {schedule.mode !== 'hourly' ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Run Time
          </label>
          <input
            type="time"
            value={schedule.time}
            onChange={(e) => updateSchedule({ time: e.target.value })}
            className={`w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 ${accentClass}`}
          />
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        <div>{describeSchedule(schedule)}</div>
        <div className="mt-1 font-mono text-[11px] text-slate-500">{config.cron}</div>
      </div>
    </div>
  );
}

export const JobsTab: React.FC = () => {
  const [configs, setConfigs] = useState<Record<JobKey, JobConfig>>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const response = await apiClient.get('/admin/settings');
      if (response.data?.success) {
        const settings = response.data.settings;
        // The API returns settings as an array or object depending on implementation
        // Let's handle both and find the keys we need
        const findValue = (key: string) => {
          if (Array.isArray(settings)) {
            return settings.find((s) => s.key === key)?.value;
          }
          return settings[key]?.value || settings[key];
        };

        setConfigs({
          backup: normalizeJobConfig(findValue('backup_job_config'), DEFAULT_CONFIGS.backup),
          mlScoring: normalizeJobConfig(
            findValue('ml_scoring_job_config'),
            DEFAULT_CONFIGS.mlScoring
          ),
          mvRefresh: normalizeJobConfig(
            findValue('mv_refresh_job_config'),
            DEFAULT_CONFIGS.mvRefresh
          ),
        });
      }
    } catch (err) {
      console.error('Failed to fetch job configs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleUpdate = async (key: JobKey) => {
    setSaving(key);
    try {
      const settingKey = JOB_SETTING_KEYS[key];
      const configToSave = configs[key];
      if (!configToSave) throw new Error('Configuration not found');

      await apiClient.put(`/admin/settings/${settingKey}`, { value: configToSave });
      alert(`${key.charAt(0).toUpperCase() + key.slice(1)} job updated successfully.`);
    } catch (err: any) {
      alert(`Failed to update job: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const updateLocalConfig = (key: JobKey, field: string, value: any) => {
    setConfigs((prev) => {
      const current = prev[key] || DEFAULT_CONFIGS[key];
      return {
        ...prev,
        [key]: { ...current, [field]: value },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Final defensive check to ensure we have the objects before rendering
  const backup = configs.backup || DEFAULT_CONFIGS.backup;
  const mlScoring = configs.mlScoring || DEFAULT_CONFIGS.mlScoring;
  const mvRefresh = configs.mvRefresh || DEFAULT_CONFIGS.mvRefresh;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Backup Job */}
      <AdminCard icon={ClockIcon} title="Automated Backups" color="from-emerald-500 to-emerald-600">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <span className="text-sm font-medium text-slate-200">Enable Schedule</span>
            <button
              onClick={() => updateLocalConfig('backup', 'enabled', !backup.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${backup.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${backup.enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <JobScheduleEditor
            accentClass="focus:ring-emerald-500/40"
            config={backup}
            jobKey="backup"
            onUpdate={(field, value) => updateLocalConfig('backup', field, value)}
          />

          <button
            onClick={() => handleUpdate('backup')}
            disabled={saving === 'backup'}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving === 'backup' ? 'Saving...' : 'Save Backup Config'}
          </button>
        </div>
      </AdminCard>

      {/* ML Scoring Job */}
      <AdminCard icon={ActivityIcon} title="Behavioral Scoring" color="from-blue-500 to-blue-600">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <span className="text-sm font-medium text-slate-200">Enable ML Scoring</span>
            <button
              onClick={() => updateLocalConfig('mlScoring', 'enabled', !mlScoring.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mlScoring.enabled ? 'bg-blue-500' : 'bg-slate-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mlScoring.enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <JobScheduleEditor
            accentClass="focus:ring-blue-500/40"
            config={mlScoring}
            jobKey="mlScoring"
            onUpdate={(field, value) => updateLocalConfig('mlScoring', field, value)}
          />

          <button
            onClick={() => handleUpdate('mlScoring')}
            disabled={saving === 'mlScoring'}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving === 'mlScoring' ? 'Saving...' : 'Save Scoring Config'}
          </button>
        </div>
      </AdminCard>

      {/* MV Refresh Job */}
      <AdminCard icon={RefreshIcon} title="View Refreshes" color="from-purple-500 to-purple-600">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <span className="text-sm font-medium text-slate-200">Enable Refresh</span>
            <button
              onClick={() => updateLocalConfig('mvRefresh', 'enabled', !mvRefresh.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mvRefresh.enabled ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mvRefresh.enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <JobScheduleEditor
            accentClass="focus:ring-purple-500/40"
            config={mvRefresh}
            jobKey="mvRefresh"
            onUpdate={(field, value) => updateLocalConfig('mvRefresh', field, value)}
          />

          <button
            onClick={() => handleUpdate('mvRefresh')}
            disabled={saving === 'mvRefresh'}
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving === 'mvRefresh' ? 'Saving...' : 'Save Refresh Config'}
          </button>
        </div>
      </AdminCard>
    </div>
  );
};
