export {};

import { BADGE_DEFAULTS } from '../../client/src/components/badgeStudio/badgeDefaults';
import { NETWORK_COLUMNS } from '../../client/src/constants/network';
import { mapApiRowToNetwork } from '../../client/src/utils/networkDataTransformation';
import { FilterBuildContext } from '../../server/src/services/filterQueryBuilder/FilterBuildContext';
import { SqlFragmentLibrary } from '../../server/src/services/filterQueryBuilder/SqlFragmentLibrary';
import { buildFastPathSupplementalPredicates } from '../../server/src/services/filterQueryBuilder/modules/networkFastPathSupplementalPredicates';
import { buildNetworkOnlyQueryImpl } from '../../server/src/services/filterQueryBuilder/modules/networkFastPathListBuilder';
import { buildNetworkNoFilterListQuery } from '../../server/src/services/filterQueryBuilder/modules/networkNoFilterBuilder';
import { buildNetworkSlowPathListQuery } from '../../server/src/services/filterQueryBuilder/modules/networkSlowPathBuilder';

jest.mock('../../server/src/config/database', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
  CONFIG: {
    MIN_VALID_TIMESTAMP: 946684800000,
    MIN_OBSERVATIONS: 2,
    MAX_PAGE_SIZE: 1000,
    DEFAULT_PAGE_SIZE: 100,
  },
}));

const base = {
  bssid: 'AA:BB:CC:DD:EE:FF',
  ssid: 'test',
  threat: { score: '0', level: 'NONE' },
};

function makeCtx(filters: Record<string, unknown>, enabled: Record<string, boolean>) {
  return new FilterBuildContext(
    filters as any,
    { ...Object.fromEntries(Object.keys(filters).map((key) => [key, false])), ...enabled } as any
  );
}

describe('mapApiRowToNetwork - device_class', () => {
  test('reads device_class from the wire', () => {
    const row = mapApiRowToNetwork({ ...base, device_class: 'FLOCK_SAFETY_CAMERA' }, 0);
    expect(row.device_class).toBe('FLOCK_SAFETY_CAMERA');
  });

  test('prefers BSSID-level surveillance_device_type over OUI support type', () => {
    const row = mapApiRowToNetwork(
      {
        ...base,
        surveillance_device_type: 'AXON_BODY_CAMERA',
        oui_surveillance_type: 'SHOTSPOTTER_SENSOR',
      },
      0
    );
    expect(row.device_class).toBe('AXON_BODY_CAMERA');
  });

  test('falls back to oui_surveillance_type', () => {
    const row = mapApiRowToNetwork(
      { ...base, surveillance_device_type: null, oui_surveillance_type: 'SHOTSPOTTER_SENSOR' },
      0
    );
    expect(row.device_class).toBe('SHOTSPOTTER_SENSOR');
  });

  test('unclassified rows have null device_class and support fields', () => {
    const row = mapApiRowToNetwork({ ...base }, 0);
    expect(row.device_class).toBeNull();
    expect(row.oui_surveillance_type).toBeNull();
    expect(row.oui_surveillance_confidence).toBeNull();
  });

  test('maps oui_surveillance_confidence correctly', () => {
    const row = mapApiRowToNetwork(
      {
        ...base,
        device_class: 'AXON_BODY_CAMERA',
        oui_surveillance_type: 'AXON_BODY_CAMERA',
        oui_surveillance_confidence: 'HIGH',
      },
      0
    );
    expect(row.oui_surveillance_confidence).toBe('HIGH');
  });

  test('empty strings are treated as null', () => {
    const row = mapApiRowToNetwork(
      { ...base, device_class: '', oui_surveillance_type: '', oui_surveillance_confidence: '' },
      0
    );
    expect(row.device_class).toBeNull();
    expect(row.oui_surveillance_type).toBeNull();
    expect(row.oui_surveillance_confidence).toBeNull();
  });
});

describe('NETWORK_COLUMNS - device_class', () => {
  test('Device Class column exists and is hidden by default', () => {
    expect(NETWORK_COLUMNS).toHaveProperty('device_class');
    expect(NETWORK_COLUMNS.device_class?.label).toBe('Device Class');
    expect(NETWORK_COLUMNS.device_class?.default).toBe(false);
  });
});

describe('BADGE_DEFAULTS - device_class', () => {
  const expectedClasses = [
    'FLOCK_SAFETY_CAMERA',
    'FS_EXT_BATTERY',
    'SHOTSPOTTER_SENSOR',
    'AXON_BODY_CAMERA',
    'MOTOROLA_BWC',
    'L3HARRIS_STINGRAY',
    'RAYTHEON_ESYSTEMS',
    'VERINT_INTERCEPT',
    'SEPTIER_WIFICATCHER',
    'ABILITY_INTERCEPT',
    'ROHDE_SCHWARZ_WLAN',
    'COBHAM_SIGINT',
    'NORSAT_SATCOM',
    'GENERAL_DYNAMICS_C4ISR',
    'NORTHROP_GRUMMAN_ISR',
    'LEONARDO_DRS_TACTICAL',
    'TADIRAN_COMMS',
    'PRIVATE_OUI_REGISTERED',
    'UBIQUITI_MESH',
    'CAMBIUM_BACKHAUL',
    'PROXIM_SURVEILLANCE',
    'PEPLINK_MOBILEPOST',
  ];

  test('preset exists and starts disabled', () => {
    expect(BADGE_DEFAULTS).toHaveProperty('device_class');
    expect(BADGE_DEFAULTS.device_class.enabled).toBe(false);
    expect(BADGE_DEFAULTS.device_class.hoverAction).toBe('vendor-intel-drawer');
  });

  test('includes operational, SIGINT, defense, private, and dual-use classes', () => {
    const exactValues = (BADGE_DEFAULTS.device_class.rules ?? [])
      .filter(
        (rule): rule is typeof rule & { match: { type: 'exact'; value: string } } =>
          rule.match.type === 'exact'
      )
      .map((rule) => rule.match.value);

    expectedClasses.forEach((deviceClass) => {
      expect(exactValues).toContain(deviceClass);
    });
  });

  test('has neutral fallback rule', () => {
    const fallback = BADGE_DEFAULTS.device_class.rules.find((rule) => rule.match.type === 'any');
    expect(fallback?.color.accentColor).toBe('#6b7280');
  });
});

describe('deviceClass filter predicate', () => {
  test('generates merged device-class predicate for single value', () => {
    const ctx = makeCtx({ deviceClass: ['FLOCK_SAFETY_CAMERA'] }, { deviceClass: true });
    const where = buildFastPathSupplementalPredicates(ctx, { addUnsupportedWigleIgnored: false });
    const combined = where.join(' ');
    expect(combined).toContain('surveillance_detections');
    expect(combined).toContain('oui_device_groups');
    expect(combined).toContain('surveillance_type');
    expect(combined).toContain('device_type');
    expect(combined).toContain('NOT EXISTS');
    expect(combined).toContain('sd2.false_positive = FALSE');
    expect(combined).not.toContain('sd3.false_positive = FALSE');
  });

  test('generates predicate for multiple values', () => {
    const ctx = makeCtx(
      { deviceClass: ['FLOCK_SAFETY_CAMERA', 'SHOTSPOTTER_SENSOR'] },
      { deviceClass: true }
    );
    const where = buildFastPathSupplementalPredicates(ctx, { addUnsupportedWigleIgnored: false });
    expect(where.join(' ')).toContain('oui_device_groups');
  });

  test('no predicate when deviceClass disabled or empty', () => {
    const disabled = buildFastPathSupplementalPredicates(
      makeCtx({ deviceClass: ['FLOCK_SAFETY_CAMERA'] }, { deviceClass: false }),
      { addUnsupportedWigleIgnored: false }
    );
    const empty = buildFastPathSupplementalPredicates(
      makeCtx({ deviceClass: [] }, { deviceClass: true }),
      {
        addUnsupportedWigleIgnored: false,
      }
    );
    expect(disabled.join(' ')).not.toContain('oui_device_groups');
    expect(empty.join(' ')).not.toContain('oui_device_groups');
  });

  test('networkWhereBuilder uses the same merged predicate for slow path filters', () => {
    const ctx = makeCtx({ deviceClass: ['AXON_BODY_CAMERA'] }, { deviceClass: true });
    const combined = ctx.buildNetworkWhere().join(' ');
    expect(combined).toContain('surveillance_detections');
    expect(combined).toContain('oui_device_groups');
    expect(combined).toContain('NOT EXISTS');
  });

  test('tracks applied filter metadata', () => {
    const ctx = makeCtx({ deviceClass: ['FLOCK_SAFETY_CAMERA'] }, { deviceClass: true });
    buildFastPathSupplementalPredicates(ctx, { addUnsupportedWigleIgnored: false });
    expect(ctx.state.appliedFilters().map((filter) => filter.field)).toContain('deviceClass');
  });
});

describe('SqlFragmentLibrary OUI Device Class helpers', () => {
  test('normalizes colonized, uncolonized, null, and malformed BSSIDs', () => {
    const sql = SqlFragmentLibrary.normalizedOuiExpression('ne');
    expect(sql).toContain("'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'");
    expect(sql).toContain('SUBSTRING(ne.bssid, 1, 8)');
    expect(sql).toContain("'^[0-9A-Fa-f]{12}$'");
    expect(sql).toContain('bssid IS NULL THEN NULL');
    expect(sql).toContain('ELSE NULL');
  });

  test('joinOuiDeviceGroups uses the shared normalized OUI expression', () => {
    const sql = SqlFragmentLibrary.joinOuiDeviceGroups('l', 'oui_grp');
    expect(sql).toContain('LEFT JOIN app.oui_device_groups oui_grp');
    expect(sql).toContain('SUBSTRING(l.bssid, 1, 8)');
  });

  test('selectDeviceClassFields suppresses OUI fallback for false-positive detections', () => {
    const sql = SqlFragmentLibrary.selectDeviceClassFields('sd', 'odg');
    expect(sql).toContain('WHEN sd.false_positive = TRUE THEN NULL');
    expect(sql).toContain('WHEN sd.false_positive = FALSE THEN sd.device_type');
    expect(sql).toContain('ELSE odg.surveillance_type');
    expect(sql).toContain('odg.surveillance_type AS oui_surveillance_type');
    expect(sql).toContain('odg.surveillance_confidence AS oui_surveillance_confidence');
  });

  test('selectSurveillanceDetectionFields hides false-positive detection support fields', () => {
    const sql = SqlFragmentLibrary.selectSurveillanceDetectionFields('sd');
    expect(sql).toContain(
      'CASE WHEN sd.false_positive = TRUE THEN NULL ELSE sd.device_type END AS surveillance_device_type'
    );
    expect(sql).toContain(
      'CASE WHEN sd.false_positive = TRUE THEN NULL ELSE sd.detection_method END AS surveillance_detection_method'
    );
  });
});

describe('Explorer Device Class query paths', () => {
  const assertDeviceClassProjection = (sql: string) => {
    expect(sql).toContain('WHEN sd.false_positive = TRUE THEN NULL');
    expect(sql).toContain('WHEN sd.false_positive = FALSE THEN sd.device_type');
    expect(sql).toContain('ELSE odg.surveillance_type');
    expect(sql).toContain(
      'CASE WHEN sd.false_positive = TRUE THEN NULL ELSE sd.device_type END AS surveillance_device_type'
    );
    expect(sql).toContain('odg.surveillance_type AS oui_surveillance_type');
    expect(sql).toContain('odg.surveillance_confidence AS oui_surveillance_confidence');
    expect(sql).toContain('LEFT JOIN app.oui_device_groups odg');
    expect(sql).toContain('LEFT JOIN app.surveillance_detections sd ON');
    expect(sql).not.toContain(
      'LEFT JOIN app.surveillance_detections sd ON UPPER(sd.bssid) = UPPER(ne.bssid) AND sd.false_positive = FALSE'
    );
  };

  test('networkFastPathListBuilder includes Device Class fields', () => {
    const sql = buildNetworkOnlyQueryImpl(new FilterBuildContext({}, {}), {}).sql;
    assertDeviceClassProjection(sql);
  });

  test('networkNoFilterBuilder includes Device Class fields', () => {
    const sql = buildNetworkNoFilterListQuery(new FilterBuildContext({}, {})).sql;
    assertDeviceClassProjection(sql);
  });

  test('networkSlowPathBuilder includes Device Class fields', () => {
    const sql = buildNetworkSlowPathListQuery(
      new FilterBuildContext({}, {}),
      () => ({ cte: 'WITH filtered_obs AS (SELECT * FROM app.observations)', params: [] }),
      {}
    ).sql;
    assertDeviceClassProjection(sql);
  });
});
