-- Batch 45: Clean stray *.fbi.gov domains out of address_line2 for FBI field offices
--
-- The FBI field office index pages include lines like "anchorage.fbi.gov" which are not address line 2.
-- We preserve the value in metadata and clear address_line2.

BEGIN;

UPDATE app.agency_offices ao SET
  address_validation_metadata = COALESCE(ao.address_validation_metadata, '{}'::jsonb)
    || CASE
      WHEN (ao.address_validation_metadata ? 'website_alt') IS TRUE THEN '{}'::jsonb
      ELSE jsonb_build_object('website_alt', ao.address_line2)
    END,
  address_line2 = NULL,
  updated_at = NOW()
WHERE ao.agency = 'FBI'
  AND ao.office_type = 'field_office'
  AND NULLIF(BTRIM(ao.address_line2), '') IS NOT NULL
  AND ao.address_line2 ~* '^[a-z0-9-]+\\.fbi\\.gov$';

COMMIT;
