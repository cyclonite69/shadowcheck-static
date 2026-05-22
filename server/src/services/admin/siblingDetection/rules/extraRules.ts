type SiblingExtraRuleDefinition = {
  name: string;
  logKey: string;
  query: string;
  includeRunId?: boolean;
};

const EXTRA_RULE_MANUAL_BOOST = `
  WITH updated AS (
    UPDATE app.network_sibling_pairs p
    SET rule        = 'manual_confirmed',
        confidence  = 1.0,
        pair_strength = 'verified',
        quality_scope = 'manual',
        computed_at = now()
    FROM app.network_sibling_overrides o
    WHERE o.bssid1 = p.bssid1
      AND o.bssid2 = p.bssid2
      AND o.relation = 'sibling'
      AND o.is_active = true
      AND p.confidence < 1.0
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM updated
`;

const EXTRA_RULE_MANUAL_INSERT = `
  WITH inserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, quality_scope, computed_at
    )
    SELECT
      o.bssid1,
      o.bssid2,
      'manual_confirmed',
      1.0,
      'manual',
      now()
    FROM app.network_sibling_overrides o
    WHERE o.relation = 'sibling'
      AND o.is_active = true
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = 'manual_confirmed',
          confidence  = 1.0,
          quality_scope = 'manual',
          computed_at = now()
      WHERE network_sibling_pairs.confidence < 1.0
    RETURNING 1
  )
  SELECT COUNT(*)::int AS count FROM inserted
`;

const EXTRA_SIBLING_RULES: SiblingExtraRuleDefinition[] = [
  { name: 'manual_boost', logKey: 'manual_boost', query: EXTRA_RULE_MANUAL_BOOST },
  { name: 'manual_insert', logKey: 'manual_insert', query: EXTRA_RULE_MANUAL_INSERT },
];

export { EXTRA_SIBLING_RULES };
export type { SiblingExtraRuleDefinition };
