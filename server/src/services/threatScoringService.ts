const logger = require('../logging/logger');
const threatRepository = require('../repositories/threatRepository');
const networkTagService = require('./networkTagService');

import { scoreBehavioralThreats } from './backgroundJobs/mlBehavioralScoring';

import type {
  ComputeThreatScoresResult,
  MarkForRecomputeResult,
  ThreatApiLevel,
  ThreatDetailedThreatDto,
  ThreatDetailedThreatRecord,
  ThreatManualTag,
  ThreatQuickThreatDto,
  ThreatQuickThreatPage,
  ThreatQuickThreatRecord,
  ThreatQuickThreatsQuery,
  ThreatScoringBatchRequest,
  ThreatScoringFullStats,
  ThreatScoringRepository,
  ThreatScoringStats,
} from './threatScoring.types';

type ThreatScoringLogger = {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
};

type ThreatScoringDependencies = {
  threatRepository: ThreatScoringRepository;
  networkTagService: {
    getManualThreatTags: () => Promise<ThreatManualTag[]>;
  };
  logger: ThreatScoringLogger;
  scoreBehavioralThreats: typeof scoreBehavioralThreats;
};

const DEFAULT_BEHAVIORAL_MIN_OBSERVATIONS = 2;
const DEFAULT_MAX_BSSID_LENGTH = 17;
const RULE_BASED_META_KEYS = new Set(['metrics', 'factors', 'flags', 'summary', 'confidence']);
const PUBLIC_PATTERN_SIGNAL_DESCRIPTION =
  'Derived from public WiGLE observation spread; does not represent local LAN observation evidence.';

const toApiThreatLevel = (value: string): ThreatApiLevel => {
  const normalized = value.toLowerCase();
  if (
    normalized === 'critical' ||
    normalized === 'high' ||
    normalized === 'medium' ||
    normalized === 'low' ||
    normalized === 'none'
  ) {
    return normalized;
  }
  return 'none';
};

const toQuickThreatDto = (record: ThreatQuickThreatRecord): ThreatQuickThreatDto => ({
  bssid: record.bssid,
  ssid: record.ssid || '<Hidden>',
  radioType: record.radioType || 'wifi',
  type: record.radioType || 'wifi',
  channel: record.channel,
  signal: record.signalDbm,
  signalDbm: record.signalDbm,
  maxSignal: record.signalDbm,
  encryption: record.encryption,
  latitude: record.latitude,
  longitude: record.longitude,
  firstSeen: record.firstSeen,
  lastSeen: record.lastSeen,
  observations: record.observations,
  totalObservations: record.observations,
  uniqueDays: record.uniqueDays,
  uniqueLocations: record.uniqueLocations,
  distanceRangeKm: record.distanceRangeKm !== null ? record.distanceRangeKm.toFixed(2) : null,
  threatScore: record.threatScore,
  threatLevel: toApiThreatLevel(record.threatLevel),
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const toDetailedThreatDto = (record: ThreatDetailedThreatRecord): ThreatDetailedThreatDto => {
  const details = record.ruleBasedFlags || {};
  const metrics = isPlainObject(details.metrics) ? details.metrics : {};
  const factors = isPlainObject(details.factors) ? details.factors : {};
  const flags = Array.isArray(details.flags) ? details.flags : [];
  const components = Object.fromEntries(
    Object.entries(details).filter(([key]) => !RULE_BASED_META_KEYS.has(key))
  );
  const publicPatternBonus = toNullableNumber(components.public_pattern_bonus);
  const rawConfidence = details.confidence;
  const confidence =
    rawConfidence !== undefined && rawConfidence !== null
      ? (Number.parseFloat(String(rawConfidence)) * 100).toFixed(0)
      : null;

  return {
    bssid: record.bssid,
    ssid: record.ssid,
    type: record.type,
    encryption: record.encryption,
    channel: record.frequency,
    signal: record.signalDbm,
    signalDbm: record.signalDbm,
    latitude: record.latitude,
    longitude: record.longitude,
    totalObservations: record.totalObservations,
    observations: record.totalObservations,
    threatScore: record.finalThreatScore,
    threatType: typeof details.summary === 'string' ? details.summary : 'Unified threat score',
    threatLevel: toApiThreatLevel(record.finalThreatLevel),
    confidence,
    patterns: {
      metrics,
      factors,
      flags,
      components,
      publicPatternSignals: {
        widePublicDistribution:
          publicPatternBonus !== null && publicPatternBonus > 0
            ? {
                scoreContribution: publicPatternBonus,
                source: 'wigle_public_observations',
                description: PUBLIC_PATTERN_SIGNAL_DESCRIPTION,
              }
            : null,
      },
    },
  };
};

class ThreatScoringService {
  private readonly threatRepository: ThreatScoringRepository;
  private readonly networkTagService: ThreatScoringDependencies['networkTagService'];
  private readonly logger: ThreatScoringLogger;
  private readonly behavioralScorer: typeof scoreBehavioralThreats;
  private isRunning: boolean;
  private lastRun: Date | null;
  private stats: ThreatScoringStats;

  constructor(deps: ThreatScoringDependencies) {
    this.threatRepository = deps.threatRepository;
    this.networkTagService = deps.networkTagService;
    this.logger = deps.logger;
    this.behavioralScorer = deps.scoreBehavioralThreats;
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalProcessed: 0,
      totalUpdated: 0,
      averageExecutionTime: 0,
      lastError: null,
    };
  }

  private async computeBehavioralThreatScores(processedBssids: string[]): Promise<number> {
    const candidates = await this.threatRepository.getBehavioralScoringCandidatesByBssids({
      bssids: processedBssids,
      minObservations: DEFAULT_BEHAVIORAL_MIN_OBSERVATIONS,
      maxBssidLength: DEFAULT_MAX_BSSID_LENGTH,
    });

    if (candidates.length === 0) {
      return 0;
    }

    const manualTags = await this.networkTagService.getManualThreatTags();
    const { scores } = this.behavioralScorer(candidates, manualTags);

    return this.threatRepository.upsertBehavioralThreatScores(
      scores.map((score) => ({
        bssid: score.bssid,
        mlThreatScore: score.ml_threat_score,
        mlThreatProbability: score.ml_threat_probability,
        mlPrimaryClass: score.ml_primary_class,
        modelVersion: score.model_version || null,
      }))
    );
  }

  async computeThreatScores(
    batchSize: number = 1000,
    maxAgeHours: number = 24
  ): Promise<ComputeThreatScoresResult> {
    if (this.isRunning) {
      this.logger.warn('Threat scoring already running, skipping');
      return { skipped: true };
    }

    this.isRunning = true;

    try {
      const startTime = Date.now();
      const request: ThreatScoringBatchRequest = { batchSize, maxAgeHours };
      this.logger.info('Starting unified threat score computation', request);

      const ruleBasedResult = await this.threatRepository.upsertRuleBasedThreatScores(request);
      const behavioralUpdated = await this.computeBehavioralThreatScores(
        ruleBasedResult.processedBssids
      );
      const executionTimeMs = Date.now() - startTime;

      this.stats = {
        totalProcessed: this.stats.totalProcessed + ruleBasedResult.processedCount,
        totalUpdated: this.stats.totalUpdated + ruleBasedResult.processedCount,
        averageExecutionTime: executionTimeMs,
        lastError: null,
      };

      this.lastRun = new Date();

      this.logger.info('Unified threat score computation completed', {
        processed: ruleBasedResult.processedCount,
        updated: ruleBasedResult.processedCount,
        behavioralUpdated,
        executionTimeMs,
        totalProcessed: this.stats.totalProcessed,
      });

      return {
        success: true,
        processed: ruleBasedResult.processedCount,
        updated: ruleBasedResult.processedCount,
        executionTimeMs,
      };
    } catch (error) {
      const err = error as Error;
      this.stats.lastError = err.message;
      this.logger.error('Threat score computation failed', { error: err.message });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async markAllForRecompute(): Promise<MarkForRecomputeResult> {
    const result = await this.computeThreatScores(1000000, 0);
    return { success: true, rowsAffected: result.processed || 0 };
  }

  async getQuickThreats(params: ThreatQuickThreatsQuery): Promise<ThreatQuickThreatPage> {
    const result = await this.threatRepository.getQuickThreats(params);
    return {
      threats: result.records.map(toQuickThreatDto),
      totalCount: result.totalCount,
    };
  }

  async getDetailedThreats(): Promise<ThreatDetailedThreatDto[]> {
    const threats = await this.threatRepository.getDetailedThreats();
    return threats.map(toDetailedThreatDto);
  }

  getStats(): ThreatScoringFullStats {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
    };
  }

  startScheduledJobs(): void {
    this.logger.info('Threat scoring scheduled jobs disabled (manual-only mode)');
  }
}

const createThreatScoringService = (
  deps: Partial<ThreatScoringDependencies> = {}
): ThreatScoringService =>
  new ThreatScoringService({
    threatRepository: deps.threatRepository || threatRepository,
    networkTagService: deps.networkTagService || networkTagService,
    logger: deps.logger || logger,
    scoreBehavioralThreats: deps.scoreBehavioralThreats || scoreBehavioralThreats,
  });

const threatScoringService = createThreatScoringService();

module.exports = threatScoringService;
module.exports.ThreatScoringService = ThreatScoringService;
module.exports.createThreatScoringService = createThreatScoringService;

export { ThreatScoringService, createThreatScoringService };
export type {
  ComputeThreatScoresResult,
  MarkForRecomputeResult,
  ThreatScoringFullStats,
  ThreatScoringStats,
};
