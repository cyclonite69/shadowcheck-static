const { query } = require('../config/database');
const logger = require('../logging/logger');

class NetworkRepository {
  async getAllNetworks() {
    try {
      const result = await query(`
        SELECT
          bssid,
          ssid,
          type,
          channel,
          max_signal as maxSignal,
          bestlevel as signalDbm,
          encryption,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          first_seen as firstSeen,
          last_seen as lastSeen,
          ml_threat_score as threatScore,
          manufacturer,
          device_type as deviceType,
          capabilities
        FROM app.networks
        ORDER BY ml_threat_score DESC NULLS LAST, max_signal DESC NULLS LAST
        LIMIT 1000
      `);

      return result.rows || [];
    } catch (error) {
      logger.error(`Error fetching networks: ${error.message}`, { error });
      return [];
    }
  }

  async getNetworksByType(type) {
    try {
      const result = await query(
        `
        SELECT
          bssid,
          ssid,
          type,
          channel,
          max_signal as maxSignal,
          bestlevel as signalDbm,
          encryption,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          first_seen as firstSeen,
          last_seen as lastSeen,
          ml_threat_score as threatScore,
          manufacturer,
          device_type as deviceType
        FROM app.networks
        WHERE type = $1
        ORDER BY ml_threat_score DESC NULLS LAST, max_signal DESC NULLS LAST
      `,
        [type]
      );

      return result.rows || [];
    } catch (error) {
      logger.error(`Error fetching ${type} networks: ${error.message}`, { error });
      return [];
    }
  }

  async getThreatenedNetworks() {
    try {
      const result = await query(`
        SELECT
          ne.bssid,
          ne.ssid,
          ne.type,
          ne.signal,
          ne.frequency,
          ne.security,
          ne.lon as longitude,
          ne.lat as latitude,
          ne.last_seen as lastSeen,
          ne.observations,
          (ne.threat->>'score')::numeric as threatScore,
          ne.threat->>'level' as threatLevel,
          ne.threat->>'summary' as threatSummary,
          ne.manufacturer
        FROM public.api_network_explorer ne
        WHERE (ne.threat->>'score')::numeric >= 25
          AND ne.threat->>'level' != 'NONE'
        ORDER BY (ne.threat->>'score')::numeric DESC
        LIMIT 100
      `);

      return result.rows || [];
    } catch (error) {
      logger.error(`Error fetching threatened networks: ${error.message}`, { error });
      return [];
    }
  }

  async getDashboardMetrics(filters = {}, enabled = {}) {
    try {
      const obsConditions = [];
      const obsCountConditions = [];
      const params = [];
      let paramIndex = 1;

      const addParam = (value) => {
        params.push(value);
        const index = paramIndex;
        paramIndex += 1;
        return `$${index}`;
      };

      // Radio types filter (radio_type column: W, E, B, L, N, G)
      if (enabled.radioTypes && filters.radioTypes && filters.radioTypes.length > 0) {
        obsConditions.push(`radio_type = ANY(${addParam(filters.radioTypes)})`);
      }

      // RSSI filters (level column)
      if (enabled.rssiMin && filters.rssiMin !== undefined) {
        obsConditions.push(`level IS NOT NULL AND level >= ${addParam(filters.rssiMin)}`);
      }
      if (enabled.rssiMax && filters.rssiMax !== undefined) {
        obsConditions.push(`level IS NOT NULL AND level <= ${addParam(filters.rssiMax)}`);
      }

      // Timeframe filter (time column - milliseconds)
      if (enabled.timeframe && filters.timeframe) {
        const now = Date.now();
        let startTime = null;

        if (filters.timeframe.type === 'relative' && filters.timeframe.relativeWindow) {
          const window = filters.timeframe.relativeWindow;
          const match = window.match(/^(\d+)([hdwmy])$/);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            const msMultipliers = {
              h: 3600000, // hour
              d: 86400000, // day
              w: 604800000, // week
              m: 2592000000, // month (30 days)
              y: 31536000000, // year
            };
            startTime = now - value * (msMultipliers[unit] || 86400000);
          }
        } else if (filters.timeframe.type === 'absolute') {
          const startValue = filters.timeframe.startTimestamp || filters.timeframe.startDate;
          if (startValue) {
            startTime = new Date(startValue).getTime();
          }
        }

        if (startTime) {
          obsConditions.push(`(EXTRACT(EPOCH FROM time) * 1000) >= ${addParam(startTime)}`);
        }

        if (filters.timeframe.type === 'absolute') {
          const endValue = filters.timeframe.endTimestamp || filters.timeframe.endDate;
          if (endValue) {
            const endTime = new Date(endValue).getTime();
            obsConditions.push(`(EXTRACT(EPOCH FROM time) * 1000) <= ${addParam(endTime)}`);
          }
        }
      }

      // Encryption filter (radio_capabilities column contains encryption info like [WPA2-PSK-CCMP])
      if (
        enabled.encryptionTypes &&
        filters.encryptionTypes &&
        filters.encryptionTypes.length > 0
      ) {
        const encPatterns = filters.encryptionTypes.map((enc) => `%${enc}%`);
        const encConditions = encPatterns.map(
          (_, i) => `radio_capabilities ILIKE $${paramIndex + i}`
        );
        obsConditions.push(`(${encConditions.join(' OR ')})`);
        params.push(...encPatterns);
        paramIndex += encPatterns.length;
      }

      // SSID filter
      if (enabled.ssid && filters.ssid) {
        obsConditions.push(`ssid ILIKE ${addParam(`%${filters.ssid}%`)}`);
      }

      // BSSID filter
      if (enabled.bssid && filters.bssid) {
        obsConditions.push(`bssid ILIKE ${addParam(`%${filters.bssid.toUpperCase()}%`)}`);
      }

      // Observation count filters (applied per BSSID)
      if (enabled.observationCountMin && filters.observationCountMin !== undefined) {
        obsCountConditions.push(`COUNT(*) >= ${addParam(filters.observationCountMin)}`);
      }
      if (enabled.observationCountMax && filters.observationCountMax !== undefined) {
        obsCountConditions.push(`COUNT(*) <= ${addParam(filters.observationCountMax)}`);
      }

      // GPS accuracy filter
      if (enabled.gpsAccuracyMax && filters.gpsAccuracyMax !== undefined) {
        obsConditions.push(
          `accuracy IS NOT NULL AND accuracy <= ${addParam(filters.gpsAccuracyMax)}`
        );
      }

      // Exclude invalid coordinates
      if (enabled.excludeInvalidCoords) {
        obsConditions.push(
          'lat IS NOT NULL',
          'lon IS NOT NULL',
          'lat BETWEEN -90 AND 90',
          'lon BETWEEN -180 AND 180'
        );
      }

      // Quality filters (temporal/extreme/duplicate/all)
      if (enabled.qualityFilter && filters.qualityFilter && filters.qualityFilter !== 'none') {
        const { DATA_QUALITY_FILTERS } = require('../services/dataQualityFilters');
        let qualityWhere = '';
        if (filters.qualityFilter === 'temporal') {
          qualityWhere = DATA_QUALITY_FILTERS.temporal_clusters;
        } else if (filters.qualityFilter === 'extreme') {
          qualityWhere = DATA_QUALITY_FILTERS.extreme_signals;
        } else if (filters.qualityFilter === 'duplicate') {
          qualityWhere = DATA_QUALITY_FILTERS.duplicate_coords;
        } else if (filters.qualityFilter === 'all') {
          qualityWhere = DATA_QUALITY_FILTERS.all();
        }

        if (qualityWhere) {
          const cleanFilter = qualityWhere
            .replace(/^\s*AND\s+/, '')
            .replace(/\bobservations\b/g, 'public.observations');
          obsConditions.push(`(${cleanFilter})`);
        }
      }

      const obsWhereClause = obsConditions.length > 0 ? `WHERE ${obsConditions.join(' AND ')}` : '';
      const obsHavingClause =
        obsCountConditions.length > 0 ? `HAVING ${obsCountConditions.join(' AND ')}` : '';

      const metricsCte = `
        WITH filtered_obs AS (
          SELECT *
          FROM public.observations
          ${obsWhereClause}
        ),
        filtered_networks AS (
          SELECT bssid, MAX(radio_type) AS radio_type
          FROM filtered_obs
          GROUP BY bssid
          ${obsHavingClause}
        )
      `;

      const result = await query(
        `
        ${metricsCte}
        SELECT
          COUNT(*) as total_networks,
          COUNT(*) FILTER (WHERE radio_type = 'W') as wifi_count,
          COUNT(*) FILTER (WHERE radio_type = 'E') as ble_count,
          COUNT(*) FILTER (WHERE radio_type = 'B') as bluetooth_count,
          COUNT(*) FILTER (WHERE radio_type = 'L') as lte_count,
          COUNT(*) FILTER (WHERE radio_type = 'N') as nr_count,
          COUNT(*) FILTER (WHERE radio_type = 'G') as gsm_count,
          (
            SELECT COUNT(DISTINCT CASE WHEN lat IS NOT NULL AND lon IS NOT NULL THEN bssid END)
            FROM filtered_obs fo
            JOIN filtered_networks fn ON fo.bssid = fn.bssid
          ) as enriched_count
        FROM filtered_networks
      `,
        params
      );

      // Get observation counts by radio type
      let obsRow = {};
      try {
        const obsResult = await query(
          `
          ${metricsCte}
          SELECT
            COUNT(*) as total_observations,
            COUNT(*) FILTER (WHERE radio_type = 'W') as wifi_observations,
            COUNT(*) FILTER (WHERE radio_type = 'E') as ble_observations,
            COUNT(*) FILTER (WHERE radio_type = 'B') as bluetooth_observations,
            COUNT(*) FILTER (WHERE radio_type = 'L') as lte_observations,
            COUNT(*) FILTER (WHERE radio_type = 'N') as nr_observations,
            COUNT(*) FILTER (WHERE radio_type = 'G') as gsm_observations
          FROM filtered_obs fo
          JOIN filtered_networks fn ON fo.bssid = fn.bssid
        `,
          params
        );
        obsRow = obsResult.rows[0] || {};
      } catch (obsError) {
        logger.error(`Error fetching observation metrics: ${obsError.message}`, { obsError });
        obsRow = {};
      }

      // Get threat counts from materialized view
      let threatCounts = {};
      try {
        const threatResult = await query(`
          SELECT
            COUNT(*) FILTER (WHERE (threat->>'level') = 'HIGH') as threats_high,
            COUNT(*) FILTER (WHERE (threat->>'level') = 'MED') as threats_medium,
            COUNT(*) FILTER (WHERE (threat->>'level') = 'LOW') as threats_low,
            COUNT(*) FILTER (WHERE (threat->>'score')::numeric >= 70) as threats_critical
          FROM public.api_network_explorer
          WHERE (threat->>'score')::numeric > 0
            AND threat->>'level' != 'NONE'
        `);
        threatCounts = threatResult.rows[0] || {};
      } catch (threatError) {
        logger.error(`Error fetching threat metrics: ${threatError.message}`, { threatError });
        threatCounts = {};
      }

      const row = result.rows[0] || {};

      return {
        totalNetworks: parseInt(row.total_networks) || 0,
        wifiCount: parseInt(row.wifi_count) || 0,
        bleCount: parseInt(row.ble_count) || 0,
        bluetoothCount: parseInt(row.bluetooth_count) || 0,
        lteCount: parseInt(row.lte_count) || 0,
        nrCount: parseInt(row.nr_count) || 0,
        gsmCount: parseInt(row.gsm_count) || 0,
        // Observation counts
        totalObservations: parseInt(obsRow.total_observations) || 0,
        wifiObservations: parseInt(obsRow.wifi_observations) || 0,
        bleObservations: parseInt(obsRow.ble_observations) || 0,
        bluetoothObservations: parseInt(obsRow.bluetooth_observations) || 0,
        lteObservations: parseInt(obsRow.lte_observations) || 0,
        nrObservations: parseInt(obsRow.nr_observations) || 0,
        gsmObservations: parseInt(obsRow.gsm_observations) || 0,
        // Threat counts from new JSONB format
        threatsCritical: parseInt(threatCounts.threats_critical) || 0,
        threatsHigh: parseInt(threatCounts.threats_high) || 0,
        threatsMedium: parseInt(threatCounts.threats_medium) || 0,
        threatsLow: parseInt(threatCounts.threats_low) || 0,
        activeSurveillance: parseInt(threatCounts.threats_high) || 0,
        enrichedCount: parseInt(row.enriched_count) || 0,
        filtersApplied: obsConditions.length + obsCountConditions.length,
      };
    } catch (error) {
      logger.error(`Error fetching dashboard metrics: ${error.message}`, { error });
      return {
        totalNetworks: 0,
        wifiCount: 0,
        bleCount: 0,
        bluetoothCount: 0,
        lteCount: 0,
        nrCount: 0,
        gsmCount: 0,
        threatsCritical: 0,
        threatsHigh: 0,
        threatsMedium: 0,
        threatsLow: 0,
        activeSurveillance: 0,
        enrichedCount: 0,
        filtersApplied: 0,
      };
    }
  }
}

module.exports = NetworkRepository;
