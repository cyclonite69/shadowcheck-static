/**
 * Spatial Filters Module
 * Handles bounding box, radius, and distance-based filtering
 */

import type { Filters, EnabledFlags, AppliedFilter } from '../types';

export class SpatialFiltersBuilder {
  private filters: Filters;
  private enabled: EnabledFlags;
  private params: unknown[];
  private paramIndex: number;
  private appliedFilters: AppliedFilter[];
  private requiresHome: boolean;

  constructor(
    filters: Filters,
    enabled: EnabledFlags,
    params: unknown[],
    paramIndex: number,
    appliedFilters: AppliedFilter[]
  ) {
    this.filters = filters;
    this.enabled = enabled;
    this.params = params;
    this.paramIndex = paramIndex;
    this.appliedFilters = appliedFilters;
    this.requiresHome = false;
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

  buildFilters(): { where: string[]; paramIndex: number; requiresHome: boolean } {
    const where: string[] = [];
    const f = this.filters;
    const e = this.enabled;

    // Bounding box
    if (
      e.boundingBox &&
      f.boundingBox &&
      f.boundingBox.minLat !== undefined &&
      f.boundingBox.maxLat !== undefined &&
      f.boundingBox.minLng !== undefined &&
      f.boundingBox.maxLng !== undefined
    ) {
      const { minLat, maxLat, minLng, maxLng } = f.boundingBox;
      where.push(
        `o.lat BETWEEN ${this.addParam(minLat)} AND ${this.addParam(maxLat)}`,
        `o.lon BETWEEN ${this.addParam(minLng)} AND ${this.addParam(maxLng)}`
      );
      this.addApplied('spatial', 'boundingBox', f.boundingBox);
    }

    // Radius filter
    if (
      e.radius &&
      f.radius &&
      f.radius.centerLat !== undefined &&
      f.radius.centerLng !== undefined &&
      f.radius.meters !== undefined
    ) {
      const { centerLat, centerLng, meters } = f.radius;
      where.push(
        `ST_DWithin(
          ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${this.addParam(centerLng)}, ${this.addParam(centerLat)}), 4326)::geography,
          ${this.addParam(meters)}
        )`
      );
      this.addApplied('spatial', 'radius', f.radius);
    }

    // Distance from home
    if (e.distanceFromHomeMin && f.distanceFromHomeMin !== undefined) {
      this.requiresHome = true;
      where.push(
        `ST_Distance(
          ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
          (SELECT ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography 
           FROM app.location_markers WHERE marker_type = 'home' LIMIT 1)
        ) >= ${this.addParam(f.distanceFromHomeMin * 1000)}`
      );
      this.addApplied('spatial', 'distanceFromHomeMin', f.distanceFromHomeMin);
    }

    if (e.distanceFromHomeMax && f.distanceFromHomeMax !== undefined) {
      this.requiresHome = true;
      where.push(
        `ST_Distance(
          ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
          (SELECT ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography 
           FROM app.location_markers WHERE marker_type = 'home' LIMIT 1)
        ) <= ${this.addParam(f.distanceFromHomeMax * 1000)}`
      );
      this.addApplied('spatial', 'distanceFromHomeMax', f.distanceFromHomeMax);
    }

    return { where, paramIndex: this.paramIndex, requiresHome: this.requiresHome };
  }

  getRequiresHome(): boolean {
    return this.requiresHome;
  }
}
