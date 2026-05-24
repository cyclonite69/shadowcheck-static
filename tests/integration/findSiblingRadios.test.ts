import { query, closePool } from '../../server/src/config/database';
import { runIntegration, describeIfIntegration } from '../helpers/integrationEnv';

describeIfIntegration('Unified Sibling Sieve (find_sibling_radios)', () => {
  const testBssids = [
    // Positive AirLink Delta-1
    '00:14:3E:FF:FF:10',
    '00:14:3E:FF:FF:11',
    // Positive Sierra Delta-1
    '28:A3:31:FF:FF:20',
    '28:A3:31:FF:FF:21',
    // Negative Delta-2 (AirLink)
    '00:14:3E:FF:FF:12',
    // Cross-vendor Negative
    '00:14:3E:FF:EE:30',
    '28:A3:31:FF:EE:31',
    // Asymmetric SSID test
    '00:14:3E:FF:DD:40',
    '00:14:3E:FF:DD:41',
    // Cradlepoint (00:30:44)
    '00:30:44:FF:CC:50',
    '00:30:44:FF:CC:51',
    // Mist positive (same SSID + different band)
    'D4:20:B0:FF:FF:11',
    'D4:20:B0:FF:FF:12',
    // Mist positive (different SSIDs + same band)
    'D4:20:B0:FF:FF:31',
    'D4:20:B0:FF:FF:32',
    // Mist negative (same SSID + same band + different chassis)
    'D4:20:B0:FF:AA:41',
    'D4:20:B0:FF:BB:41',
    // Mist Rule Correction tests (using EE to avoid clashes with live database observations)
    'D4:20:B0:EE:8F:E1',
    'D4:20:B0:EE:8F:E2',
    'D4:20:B0:EE:8C:E2',
    // AirLink fifth-octet variation tests
    '00:14:3E:EE:8F:E1',
    '00:14:3E:EE:8F:E2',
    '00:14:3E:EE:8C:E2',
    // Sierra fifth-octet variation tests
    '28:A3:31:EE:8F:E1',
    '28:A3:31:EE:8F:E2',
    '28:A3:31:EE:8C:E2',
  ];

  beforeAll(async () => {
    // Clear out any stale versions in test networks (safe since they are unique to this test)
    await query(`DELETE FROM app.networks WHERE bssid = ANY($1)`, [testBssids]);

    // Insert mock networks
    await query(`
      INSERT INTO app.networks (bssid, ssid, type, frequency, capabilities, lasttime_ms, lastlat, lastlon, bestlat, bestlon)
      VALUES
        ('00:14:3E:FF:FF:10', 'AirLink_Target', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('00:14:3E:FF:FF:11', 'AirLink_Twin',   'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        ('28:A3:31:FF:FF:20', 'Sierra_Target',  'W', 2437, '', 1716500000000, 42.456, -83.456, 42.456, -83.456),
        ('28:A3:31:FF:FF:21', 'Sierra_Twin',    'W', 2437, '', 1716500000000, 42.456, -83.456, 42.456, -83.456),

        ('00:14:3E:FF:FF:12', 'AirLink_Delta2', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        ('00:14:3E:FF:EE:30', 'AirLink_Cross',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('28:A3:31:FF:EE:31', 'Sierra_Cross',   'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        ('00:14:3E:FF:DD:40', 'SSID_One',       'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('00:14:3E:FF:DD:41', 'SSID_Two_Diff',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        ('00:30:44:FF:CC:50', 'Cradle_One',     'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('00:30:44:FF:CC:51', 'Cradle_Two',     'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        -- Mist positive (same SSID + different band)
        ('D4:20:B0:FF:FF:11', 'eduroam', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('D4:20:B0:FF:FF:12', 'eduroam', 'W', 5745, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        -- Mist positive (different SSIDs + same band)
        ('D4:20:B0:FF:FF:31', 'eduroam', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('D4:20:B0:FF:FF:32', 'MGuest',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        -- Mist negative (same SSID + same band + different chassis)
        ('D4:20:B0:FF:AA:41', 'eduroam', 'W', 2437, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('D4:20:B0:FF:BB:41', 'eduroam', 'W', 2437, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        -- Mist Rule Correction tests
        ('D4:20:B0:EE:8F:E1', 'eduroam', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('D4:20:B0:EE:8F:E2', 'MGuest',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('D4:20:B0:EE:8C:E2', 'MGuest',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        -- AirLink fifth-octet variation tests
        ('00:14:3E:EE:8F:E1', 'AirLink_1', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('00:14:3E:EE:8F:E2', 'AirLink_2', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('00:14:3E:EE:8C:E2', 'AirLink_3', 'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),

        -- Sierra fifth-octet variation tests
        ('28:A3:31:EE:8F:E1', 'Sierra_1',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('28:A3:31:EE:8F:E2', 'Sierra_2',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123),
        ('28:A3:31:EE:8C:E2', 'Sierra_3',  'W', 2412, '', 1716500000000, 42.123, -83.123, 42.123, -83.123)
    `);
  });

  afterAll(async () => {
    // Cleanup inserted mock networks
    await query(`DELETE FROM app.networks WHERE bssid = ANY($1)`, [testBssids]);
    await closePool();
  });

  // ── Non-regression Verification ─────────────────────────────────────────────
  test('Positive: AirLink delta-1 twin is paired and labeled AIRLINK_DELTA1_TWIN', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:14:3E:FF:FF:10')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '00:14:3E:FF:FF:11');
    expect(sibling).toBeDefined();
    expect(sibling.rule).toBe('AIRLINK_DELTA1_TWIN');
  });

  test('Positive: Sierra delta-1 twin is paired and labeled SIERRA_DELTA1_TWIN', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('28:A3:31:FF:FF:20')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '28:A3:31:FF:FF:21');
    expect(sibling).toBeDefined();
    expect(sibling.rule).toBe('SIERRA_DELTA1_TWIN');
  });

  test('Negative: delta-2 candidate does NOT match the DELTA1 rules', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:14:3E:FF:FF:10')`);
    const rows = res.rows;
    // Assert that if delta-2 exists, it does not emit the DELTA1 labels
    const delta2 = rows.find((r) => r.sibling_bssid === '00:14:3E:FF:FF:12');
    if (delta2) {
      expect(delta2.rule).not.toBe('AIRLINK_DELTA1_TWIN');
      expect(delta2.rule).not.toBe('SIERRA_DELTA1_TWIN');
    }
  });

  test('Negative: AirLink does not pair with Sierra under this rule', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:14:3E:FF:EE:30')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '28:A3:31:FF:EE:31');
    expect(sibling).toBeUndefined();
  });

  test('Permissive: SSID is not required (different SSIDs pair cleanly)', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:14:3E:FF:DD:40')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '00:14:3E:FF:DD:41');
    expect(sibling).toBeDefined();
    expect(sibling.rule).toBe('AIRLINK_DELTA1_TWIN');
  });

  test('Negative: Cradlepoint (00:30:44) does not emit DELTA1_TWIN rules', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:30:44:FF:CC:50')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '00:30:44:FF:CC:51');
    if (sibling) {
      expect(sibling.rule).not.toBe('AIRLINK_DELTA1_TWIN');
      expect(sibling.rule).not.toBe('SIERRA_DELTA1_TWIN');
    }
  });

  // ── Mist Systems Guardrail Verification ──────────────────────────────────────
  test('Mist Guardrail Negative: same SSID + same band + different chassis block must not pair under Class B', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('D4:20:B0:FF:AA:41')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === 'D4:20:B0:FF:BB:41');
    expect(sibling).toBeUndefined(); // Rejected! Same SSID + same band (2.4 GHz) across different chasses
  });

  test('Mist Guardrail Positive: same SSID + different band may pair if BSSID math supports it', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('D4:20:B0:FF:FF:11')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === 'D4:20:B0:FF:FF:12');
    expect(sibling).toBeDefined(); // Permitted! Same SSID but different bands (2.4 GHz vs 5 GHz) on the same chassis
    expect(sibling.rule).toBe('Class C');
  });

  test('Mist Guardrail Positive: different SSIDs + same band may pair if BSSID math supports it', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('D4:20:B0:FF:FF:31')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === 'D4:20:B0:FF:FF:32');
    expect(sibling).toBeDefined(); // Permitted! Different SSIDs on the same band (2.4 GHz) on the same chassis
    expect(sibling.rule).toBe('Class C');
  });

  // ── Vendor-Specific Sibling Logic (5th-Octet Exclusions) ──────────────────
  test('Mist Rule Correction: same first 5 octets matches', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('D4:20:B0:EE:8F:E1')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === 'D4:20:B0:EE:8F:E2');
    expect(sibling).toBeDefined();
    expect(sibling.rule).toBe('Class C');
  });

  test('Mist Rule Correction: fifth-octet variation does not match', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('D4:20:B0:EE:8F:E2')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === 'D4:20:B0:EE:8C:E2');
    expect(sibling).toBeUndefined(); // Rejected! Fifth-octet variation (8F vs 8C)
  });

  test('AirLink delta twin same first 5 octets matches', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:14:3E:EE:8F:E1')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '00:14:3E:EE:8F:E2');
    expect(sibling).toBeDefined();
    expect(sibling.rule).toBe('AIRLINK_DELTA1_TWIN');
  });

  test('AirLink delta twin fifth-octet variation does not match', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('00:14:3E:EE:8F:E2')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '00:14:3E:EE:8C:E2');
    expect(sibling).toBeUndefined(); // Rejected! Fifth-octet variation (8F vs 8C)
  });

  test('Sierra delta twin same first 5 octets matches', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('28:A3:31:EE:8F:E1')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '28:A3:31:EE:8F:E2');
    expect(sibling).toBeDefined();
    expect(sibling.rule).toBe('SIERRA_DELTA1_TWIN');
  });

  test('Sierra delta twin fifth-octet variation does not match', async () => {
    const res = await query(`SELECT * FROM app.find_sibling_radios('28:A3:31:EE:8F:E2')`);
    const sibling = res.rows.find((r) => r.sibling_bssid === '28:A3:31:EE:8C:E2');
    expect(sibling).toBeUndefined(); // Rejected! Fifth-octet variation (8F vs 8C)
  });
});
