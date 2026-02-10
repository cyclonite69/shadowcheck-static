/**
 * Observation Filters Module
 * Handles observation-level filtering logic
 */

import { NOISE_FLOOR_DBM, RELATIVE_WINDOWS } from '../constants';
import { OBS_TYPE_EXPR, SECURITY_EXPR, WIFI_CHANNEL_EXPR } from '../sqlExpressions';
import { isOui, coerceOui } from '../normalizers';
import type { Filters, EnabledFlags, AppliedFilter, IgnoredFilter } from '../types';

export class ObservationFiltersBuilder {
  private filters: Filters;
  private enabled: EnabledFlags;
  private params: unknown[];
  private paramIndex: number;
  private appliedFilters: AppliedFilter[];
  private ignoredFilters: IgnoredFilter[];

  constructor(
    filters: Filters,
    enabled: EnabledFlags,
    params: unknown[],
    paramIndex: number,
    appliedFilters: AppliedFilter[],
    ignoredFilters: IgnoredFilter[]
  ) {
    this.filters = filters;
    this.enabled = enabled;
    this.params = params;
    this.paramIndex = paramIndex;
    this.appliedFilters = appliedFilters;
    this.ignoredFilters = ignoredFilters;
  }

  private addParam(value: unknown): string {
    this.params.push(value);
    const index = this.paramIndex;
    this.paramIndex += 1;
    return `$${index}`;
  }

  private addApplied(type: string, field: string, value: unknown): void {
    this.appliedFilters.push({ type, field, value });
  }

  private addIgnored(type: string, field: string, reason: string): void {
    this.ignoredFilters.push({ type, field, reason });
  }

  buildFilters(): { where: string[]; paramIndex: number } {
    const where: string[] = [];
    const f = this.filters;
    const e = this.enabled;

    // GPS Accuracy
    if (e.gpsAccuracyMax && f.gpsAccuracyMax !== undefined) {
      where.push(
        `o.accuracy IS NOT NULL AND o.accuracy > 0 AND o.accuracy <= ${this.addParam(
          f.gpsAccuracyMax
        )}`
      );
      this.addApplied('observation', 'gpsAccuracyMax', f.gpsAccuracyMax);
    }

    // RSSI filters
    if (e.rssiMin && f.rssiMin !== undefined) {
      where.push(`o.level >= ${this.addParam(f.rssiMin)}`);
      this.addApplied('observation', 'rssiMin', f.rssiMin);
    }

    if (e.rssiMax && f.rssiMax !== undefined) {
      where.push(`o.level <= ${this.addParam(f.rssiMax)}`);
      this.addApplied('observation', 'rssiMax', f.rssiMax);
    }

    // Exclude noise floor
    if (e.excludeNoiseFloor) {
      where.push(`o.level > ${NOISE_FLOOR_DBM}`);
      this.addApplied('quality', 'excludeNoiseFloor', true);
    }

    // Invalid coordinates
    if (e.excludeInvalidCoords) {
      where.push(
        'o.lat IS NOT NULL',
        'o.lon IS NOT NULL',
        'o.lat BETWEEN -90 AND 90',
        'o.lon BETWEEN -180 AND 180'
      );
      this.addApplied('quality', 'excludeInvalidCoords', true);
    }

    // Temporal filters
    if (e.observationTimeMin && f.observationTimeMin) {
      where.push(`o.time >= ${this.addParam(new Date(f.observationTimeMin))}`);
      this.addApplied('temporal', 'observationTimeMin', f.observationTimeMin);
    }

    if (e.observationTimeMax && f.observationTimeMax) {
      where.push(`o.time <= ${this.addParam(new Date(f.observationTimeMax))}`);
      this.addApplied('temporal', 'observationTimeMax', f.observationTimeMax);
    }

    // Relative time window
    if (e.relativeWindow && f.relativeWindow && RELATIVE_WINDOWS[f.relativeWindow]) {
      const interval = RELATIVE_WINDOWS[f.relativeWindow];
      where.push(`o.time >= NOW() - INTERVAL '${interval}'`);
      this.addApplied('temporal', 'relativeWindow', f.relativeWindow);
    }

    // Radio type
    if (e.radioType && f.radioType && f.radioType.length > 0) {
      const types = f.radioType.map((t) => this.addParam(t));
      where.push(`(${OBS_TYPE_EXPR}) IN (${types.join(', ')})`);
      this.addApplied('network', 'radioType', f.radioType);
    }

    // Security
    if (e.security && f.security && f.security.length > 0) {
      const securities = f.security.map((s) => this.addParam(s));
      where.push(`(${SECURITY_EXPR}) IN (${securities.join(', ')})`);
      this.addApplied('network', 'security', f.security);
    }

    // WiFi channel
    if (e.wifiChannel && f.wifiChannel && f.wifiChannel.length > 0) {
      const channels = f.wifiChannel.map((c) => this.addParam(c));
      where.push(`(${WIFI_CHANNEL_EXPR}) IN (${channels.join(', ')})`);
      this.addApplied('network', 'wifiChannel', f.wifiChannel);
    }

    // Manufacturer (OUI)
    if (e.manufacturer && f.manufacturer && f.manufacturer.length > 0) {
      const validOuis = f.manufacturer.filter(isOui).map(coerceOui);
      if (validOuis.length > 0) {
        const ouiParams = validOuis.map((oui) => this.addParam(oui));
        where.push(`SUBSTRING(o.bssid, 1, 8) IN (${ouiParams.join(', ')})`);
        this.addApplied('network', 'manufacturer', validOuis);
      } else {
        this.addIgnored('network', 'manufacturer', 'No valid OUIs');
      }
    }

    return { where, paramIndex: this.paramIndex };
  }
}
