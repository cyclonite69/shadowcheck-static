-- Batch 43: Revert normalized ZIP+4 where it conflicts with the stored ZIP5
--
-- Rationale:
-- Some addresses near borders / ambiguous roads can produce a valid Smarty candidate with a different ZIP5.
-- Until we have a dedicated review workflow, we do not want normalized_postal_code to contradict postal_code.
--
-- This preserves the suggested ZIP+4 in address_validation_metadata for later review.

BEGIN;

UPDATE app.agency_offices ao SET
  address_validation_metadata = COALESCE(ao.address_validation_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'zip4_suggested', ao.normalized_postal_code,
      'zip4_suggested_reverted_at', NOW()
    ),
  normalized_postal_code = ao.postal_code,
  updated_at = NOW()
WHERE ao.normalized_postal_code ~ '^[0-9]{5}-[0-9]{4}$'
  AND ao.postal_code ~ '^[0-9]{5}$'
  AND substring(ao.normalized_postal_code from 1 for 5) <> ao.postal_code;

COMMIT;
