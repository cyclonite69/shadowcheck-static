export {};

import {
  SCHEMA_ALIASES,
  FIELD_EXPRESSIONS,
  NULL_SAFE_COMPARISONS,
} from '../../server/src/services/filterQueryBuilder/SchemaCompat';

describe('SchemaCompat', () => {
  test('default aliases are stable and typed', () => {
    expect(SCHEMA_ALIASES.network).toBe('ne');
    expect(SCHEMA_ALIASES.observation).toBe('o');
    expect(SCHEMA_ALIASES.networkTags).toBe('nt');
  });

  test('manufacturer and threat tag expressions are schema-compatible', () => {
    expect(FIELD_EXPRESSIONS.manufacturerName('rm')).toContain("to_jsonb(rm)->>'organization_name'");
    expect(FIELD_EXPRESSIONS.manufacturerAddress('rm')).toContain(
      "to_jsonb(rm)->>'organization_address'"
    );
    expect(FIELD_EXPRESSIONS.threatTag('nt')).toContain("to_jsonb(nt)->>'threat_tag'");
    expect(FIELD_EXPRESSIONS.threatTagLowercase('nt')).toContain('LOWER(COALESCE(');
  });

  test('observation coordinates and null-safe comparisons include fallbacks', () => {
    expect(FIELD_EXPRESSIONS.observationLat('o')).toBe('COALESCE(o.lat, ST_Y(o.geom::geometry))');
    expect(FIELD_EXPRESSIONS.observationLon('o')).toBe('COALESCE(o.lon, ST_X(o.geom::geometry))');
    expect(NULL_SAFE_COMPARISONS.isIgnored('nt')).toBe(
      "COALESCE((to_jsonb(nt)->>'is_ignored')::boolean, FALSE)"
    );
  });
});
