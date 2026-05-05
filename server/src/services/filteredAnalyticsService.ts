import type { QueryResult } from './filterQueryBuilder/types';

import { UniversalFilterQueryBuilder } from './filterQueryBuilder';
const logger = require('../logging/logger');
const v2Service = require('./v2Service');

type PageType = 'geospatial' | 'wigle';
type FiltersInput = Record<string, unknown>;
type EnabledInput = Record<string, boolean>;

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function executeQuery<T>(query: QueryResult): Promise<T[]> {
  const result = await v2Service.executeV2Query(query.sql, query.params);
  return (result.rows || []) as T[];
}

export async function getFilteredAnalytics(
  filters: FiltersInput,
  enabled: EnabledInput,
  pageType: PageType = 'geospatial'
): Promise<any> {
  const start = Date.now();
  const builder = new UniversalFilterQueryBuilder(filters, enabled, { pageType });
  const validationErrors = builder.getValidationErrors();
  if (validationErrors.length > 0) {
    logger.error('Invalid filters for getFilteredAnalytics', {
      validationErrors,
      pageType,
      enabledKeys: Object.keys(enabled || {}).filter((key) => enabled[key]),
      filterKeys: Object.keys(filters || {}),
    });
    throw new Error(`Invalid filter payload: ${validationErrors.join('; ')}`);
  }
  const queries = builder.buildAnalyticsQueries({ useLatestPerBssid: true });

  const [
    networkTypesRows,
    signalStrengthRows,
    securityRows,
    threatDistributionRows,
    temporalActivityRows,
    radioTypeOverTimeRows,
    threatTrendsRows,
    topNetworksRows,
  ] = await Promise.all([
    executeQuery<any>(queries.networkTypes),
    executeQuery<any>(queries.signalStrength),
    executeQuery<any>(queries.security),
    executeQuery<any>(queries.threatDistribution),
    executeQuery<any>(queries.temporalActivity),
    executeQuery<any>(queries.radioTypeOverTime),
    executeQuery<any>(queries.threatTrends),
    executeQuery<any>(queries.topNetworks),
  ]);

  const data = {
    networkTypes: networkTypesRows.map((row: any) => ({
      type: row.network_type || row.type || 'Other',
      count: asNumber(row.count),
    })),
    signalStrength: signalStrengthRows.map((row: any) => ({
      signal_range: row.signal_range || row.range || '-90',
      range: row.signal_range || row.range || '-90',
      count: asNumber(row.count),
    })),
    security: securityRows.map((row: any) => ({
      security_type: row.security_type || row.type || 'Unknown',
      type: row.security_type || row.type || 'Unknown',
      count: asNumber(row.count),
    })),
    threatDistribution: threatDistributionRows.map((row: any) => ({
      range: row.range,
      count: asNumber(row.count),
    })),
    temporalActivity: temporalActivityRows.map((row: any) => ({
      hour: asNumber(row.hour),
      count: asNumber(row.count),
    })),
    radioTypeOverTime: radioTypeOverTimeRows.map((row: any) => ({
      date: row.date,
      network_type: row.network_type || row.type || 'Other',
      type: row.network_type || row.type || 'Other',
      count: asNumber(row.count),
    })),
    threatTrends: threatTrendsRows.map((row: any) => {
      const avgScore = asNumber(row.avg_score);
      const criticalCount = asNumber(row.critical_count);
      const highCount = asNumber(row.high_count);
      const mediumCount = asNumber(row.medium_count);
      const lowCount = asNumber(row.low_count);
      const networkCount = asNumber(row.network_count);
      return {
        date: row.date,
        avg_score: avgScore,
        avgScore,
        critical_count: criticalCount,
        criticalCount,
        high_count: highCount,
        highCount,
        medium_count: mediumCount,
        mediumCount,
        low_count: lowCount,
        lowCount,
        network_count: networkCount,
        networkCount,
      };
    }),
    topNetworks: topNetworksRows.map((row: any) => {
      const observations = asNumber(row.observation_count);
      return {
        bssid: row.bssid,
        ssid: row.ssid,
        observation_count: observations,
        observations,
        first_seen: row.first_seen,
        firstSeen: row.first_seen,
        last_seen: row.last_seen,
        lastSeen: row.last_seen,
      };
    }),
  };

  return {
    data,
    queryDurationMs: Date.now() - start,
  };
}
