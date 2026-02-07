-- Batch 42: Upgrade raw postal_code to ZIP+4 where normalized_postal_code has ZIP+4
--
-- We keep raw address lines untouched, but postal_code is a derived field that benefits from ZIP+4.
-- To preserve provenance, we store the original 5-digit ZIP (if any) in address_validation_metadata.
--
-- Safety:
-- - Only updates when postal_code is blank or 5-digit.
-- - Only updates when normalized_postal_code is ZIP+4.
-- - If postal_code is present, require ZIP5 match between raw and normalized.

BEGIN;

UPDATE app.agency_offices ao SET
  address_validation_metadata =
    COALESCE(ao.address_validation_metadata, '{}'::jsonb)
    || CASE
      WHEN ao.postal_code ~ '^[0-9]{5}$' AND (ao.address_validation_metadata ? 'postal_code_original') IS NOT TRUE
        THEN jsonb_build_object('postal_code_original', ao.postal_code)
      ELSE '{}'::jsonb
    END,
  postal_code = ao.normalized_postal_code,
  updated_at = NOW()
WHERE ao.normalized_postal_code ~ '^[0-9]{5}-[0-9]{4}$'
  AND (ao.postal_code IS NULL OR BTRIM(ao.postal_code) = '' OR ao.postal_code ~ '^[0-9]{5}$')
  AND (
    ao.postal_code IS NULL
    OR BTRIM(ao.postal_code) = ''
    OR substring(ao.normalized_postal_code from 1 for 5) = ao.postal_code
  );

COMMIT;
