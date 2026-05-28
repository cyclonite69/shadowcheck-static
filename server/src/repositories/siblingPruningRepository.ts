import { adminQuery } from '../services/admin/siblingDetection/adminQueryAdapter';

export interface HardwareOverflowResult {
  oui: string;
  ssid: string;
  node_count: number;
}

export interface SequentialOverflowResult {
  component_id: string;
  rule: string;
  node_count: number;
}

export class SiblingPruningRepository {
  /**
   * Check for hardware overflow (>= 17 connected nodes for W networks with >= 5 observations)
   */
  async checkHardwareOverflow(): Promise<HardwareOverflowResult[]> {
    const res = await adminQuery(`
      WITH candidate_nodes AS (
        SELECT
          mv.bssid,
          mv.ssid,
          SUBSTRING(mv.bssid, 1, 8) AS OUI
        FROM app.api_network_explorer_mv mv
        WHERE mv.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
          AND mv.type = 'W'
          AND mv.observations >= 5
      ),
      cluster_sizes AS (
        SELECT
          OUI,
          ssid,
          COUNT(DISTINCT bssid) AS node_count
        FROM candidate_nodes
        GROUP BY OUI, ssid
      )
      SELECT OUI AS oui, ssid, node_count
      FROM cluster_sizes
      WHERE node_count >= 17
    `);
    return res.rows || [];
  }

  /**
   * Prune hardware overflow from active sibling tracking for rule 'cross_oui_ssid_exact'
   */
  async pruneHardwareOverflow(): Promise<void> {
    await adminQuery(`
      WITH candidate_nodes AS (
        SELECT
          mv.bssid,
          mv.ssid,
          SUBSTRING(mv.bssid, 1, 8) AS OUI
        FROM app.api_network_explorer_mv mv
        WHERE mv.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
          AND mv.type = 'W'
          AND mv.observations >= 5
      ),
      cluster_sizes AS (
        SELECT
          OUI,
          ssid,
          COUNT(DISTINCT bssid) AS node_count
        FROM candidate_nodes
        GROUP BY OUI, ssid
      ),
      overflow_bssids AS (
        SELECT cn.bssid
        FROM candidate_nodes cn
        JOIN cluster_sizes cs ON cs.OUI = cn.OUI AND cs.ssid = cn.ssid
        WHERE cs.node_count >= 17
      )
      DELETE FROM app.network_sibling_pairs
      WHERE (bssid1 IN (SELECT bssid FROM overflow_bssids)
         OR bssid2 IN (SELECT bssid FROM overflow_bssids))
         AND rule = 'cross_oui_ssid_exact';
    `);
  }

  /**
   * Check for 16-node Connected Component Ceiling overflow for sequential rules
   */
  async checkSequentialOverflow(): Promise<SequentialOverflowResult[]> {
    const res = await adminQuery(`
      WITH RECURSIVE
      nodes AS (
        SELECT DISTINCT bssid, rule FROM (
          SELECT bssid1 AS bssid, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
          UNION ALL
          SELECT bssid2 AS bssid, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
        ) t
        WHERE rule IN ('Class A', 'Unnamed Recursive (Class A)', 'Class B', 'Unnamed Recursive (Class B)', 'Class C', 'last_octet_sequential', 'middle_octets_sequential', 'upper_octet_rotation')
      ),
      edges AS (
        SELECT bssid1 AS a, bssid2 AS b, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
          AND rule IN ('Class A', 'Unnamed Recursive (Class A)', 'Class B', 'Unnamed Recursive (Class B)', 'Class C', 'last_octet_sequential', 'middle_octets_sequential', 'upper_octet_rotation')
        UNION
        SELECT bssid2 AS a, bssid1 AS b, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
          AND rule IN ('Class A', 'Unnamed Recursive (Class A)', 'Class B', 'Unnamed Recursive (Class B)', 'Class C', 'last_octet_sequential', 'middle_octets_sequential', 'upper_octet_rotation')
      ),
      comp AS (
        SELECT bssid AS node, bssid AS comp_id, rule FROM nodes
        UNION
        SELECT e.b AS node, LEAST(c.comp_id, e.b) AS comp_id, c.rule
        FROM comp c
        JOIN edges e ON e.a = c.node AND e.rule = c.rule
      ),
      final_comp AS (
        SELECT node, MIN(comp_id) AS comp_id, rule
        FROM comp
        GROUP BY node, rule
      ),
      component_sizes AS (
        SELECT comp_id, rule, COUNT(DISTINCT node) AS node_count
        FROM final_comp
        GROUP BY comp_id, rule
      )
      SELECT comp_id AS component_id, rule, node_count
      FROM component_sizes
      WHERE node_count >= 17
      ORDER BY node_count DESC;
    `);
    return res.rows || [];
  }

  /**
   * Prune sequential overflow by deleting overflowing component edges
   */
  async pruneSequentialOverflow(): Promise<number> {
    const res = await adminQuery(`
      WITH RECURSIVE
      nodes AS (
        SELECT DISTINCT bssid, rule FROM (
          SELECT bssid1 AS bssid, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
          UNION ALL
          SELECT bssid2 AS bssid, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
        ) t
        WHERE rule IN ('Class A', 'Unnamed Recursive (Class A)', 'Class B', 'Unnamed Recursive (Class B)', 'Class C', 'last_octet_sequential', 'middle_octets_sequential', 'upper_octet_rotation')
      ),
      edges AS (
        SELECT bssid1 AS a, bssid2 AS b, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
          AND rule IN ('Class A', 'Unnamed Recursive (Class A)', 'Class B', 'Unnamed Recursive (Class B)', 'Class C', 'last_octet_sequential', 'middle_octets_sequential', 'upper_octet_rotation')
        UNION
        SELECT bssid2 AS a, bssid1 AS b, rule FROM app.network_sibling_pairs WHERE rule <> 'manual_confirmed'
          AND rule IN ('Class A', 'Unnamed Recursive (Class A)', 'Class B', 'Unnamed Recursive (Class B)', 'Class C', 'last_octet_sequential', 'middle_octets_sequential', 'upper_octet_rotation')
      ),
      comp AS (
        SELECT bssid AS node, bssid AS comp_id, rule FROM nodes
        UNION
        SELECT e.b AS node, LEAST(c.comp_id, e.b) AS comp_id, c.rule
        FROM comp c
        JOIN edges e ON e.a = c.node AND e.rule = c.rule
      ),
      final_comp AS (
        SELECT node, MIN(comp_id) AS comp_id, rule
        FROM comp
        GROUP BY node, rule
      ),
      overflowing_components AS (
        SELECT comp_id, rule
        FROM final_comp
        GROUP BY comp_id, rule
        HAVING COUNT(DISTINCT node) >= 17
      ),
      overflow_edges AS (
        SELECT p.bssid1, p.bssid2, p.rule
        FROM app.network_sibling_pairs p
        JOIN final_comp c1 ON p.bssid1 = c1.node AND p.rule = c1.rule
        JOIN final_comp c2 ON p.bssid2 = c2.node AND p.rule = c2.rule
        JOIN overflowing_components oc ON c1.comp_id = oc.comp_id AND c1.rule = oc.rule
        WHERE c1.comp_id = c2.comp_id
      )
      DELETE FROM app.network_sibling_pairs p
      USING overflow_edges oe
      WHERE p.bssid1 = oe.bssid1
        AND p.bssid2 = oe.bssid2
        AND p.rule = oe.rule;
    `);
    return res.rowCount || 0;
  }
}
