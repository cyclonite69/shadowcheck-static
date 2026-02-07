-- Batch 46: Fix FBI field office address parsing where address_line2 contains a *.fbi.gov domain
--
-- Some parsed field office records have address_line2 polluted with a local domain, sometimes mixed
-- with the actual street address. This batch:
-- - Extracts the domain into address_validation_metadata.website_alt
-- - Promotes a numeric street segment into address_line1 when present
-- - Moves the prior address_line1 (often a building name) into address_line2, along with any extra
--   address parts (e.g., "8th Floor")
-- - Clears address_line2 when it's only a domain.
--
-- This improves geocoding/ZIP+4 success and keeps the original information.

BEGIN;

-- Case 1: address_line2 ends with ", <domain>.fbi.gov" and contains an address segment.
WITH candidates AS (
  SELECT
    id,
    address_line1 AS old_line1,
    address_line2 AS old_line2,
    -- Extract domain at the end.
    lower(regexp_replace(address_line2, '.*\\b([a-z0-9-]+\\.fbi\\.gov)\\s*$', '\\1')) AS domain,
    -- Strip the trailing ", <domain>" segment.
    btrim(regexp_replace(address_line2, '\\s*,\\s*[a-z0-9-]+\\.fbi\\.gov\\s*$', '')) AS addr_part
  FROM app.agency_offices
  WHERE agency='FBI'
    AND office_type='field_office'
    AND NULLIF(BTRIM(address_line2),'') IS NOT NULL
    AND address_line2 ~* ',\\s*[a-z0-9-]+\\.fbi\\.gov\\s*$'
), parsed AS (
  SELECT
    id,
    old_line1,
    old_line2,
    domain,
    addr_part,
    -- First comma token (likely street address)
    btrim(split_part(addr_part, ',', 1)) AS street_candidate,
    NULLIF(btrim(regexp_replace(addr_part, '^\\s*[^,]+\\s*(,\\s*)?', '')), '') AS rest_candidate
  FROM candidates
), updates AS (
  SELECT
    id,
    domain,
    -- Use the street candidate as line1 only if it starts with a number.
    CASE
      WHEN street_candidate ~ '^\\d' THEN street_candidate
      ELSE old_line1
    END AS new_line1,
    concat_ws(', ',
      -- If we promoted a street, keep the previous line1 as building/descriptor.
      CASE WHEN street_candidate ~ '^\\d' THEN NULLIF(btrim(old_line1), '') ELSE NULL END,
      NULLIF(btrim(rest_candidate), '')
    ) AS new_line2,
    old_line2
  FROM parsed
)
UPDATE app.agency_offices ao SET
  address_validation_metadata = COALESCE(ao.address_validation_metadata, '{}'::jsonb)
    || CASE WHEN (ao.address_validation_metadata ? 'website_alt') IS TRUE THEN '{}'::jsonb ELSE jsonb_build_object('website_alt', u.domain) END
    || jsonb_build_object('address_line2_parsed_from', u.old_line2, 'address_line2_parsed_at', NOW()),
  address_line1 = u.new_line1,
  address_line2 = NULLIF(u.new_line2, ''),
  updated_at = NOW()
FROM updates u
WHERE ao.id = u.id;

-- Case 2: address_line2 is only a domain.
UPDATE app.agency_offices ao SET
  address_validation_metadata = COALESCE(ao.address_validation_metadata, '{}'::jsonb)
    || CASE WHEN (ao.address_validation_metadata ? 'website_alt') IS TRUE THEN '{}'::jsonb ELSE jsonb_build_object('website_alt', lower(btrim(ao.address_line2))) END
    || jsonb_build_object('address_line2_cleared_at', NOW()),
  address_line2 = NULL,
  updated_at = NOW()
WHERE ao.agency='FBI'
  AND ao.office_type='field_office'
  AND NULLIF(BTRIM(ao.address_line2),'') IS NOT NULL
  AND ao.address_line2 ~* '^[a-z0-9-]+\\.fbi\\.gov$';

COMMIT;
