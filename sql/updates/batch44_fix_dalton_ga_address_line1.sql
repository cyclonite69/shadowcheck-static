-- Batch 44: Fix Dalton, GA resident agency street address
--
-- Row had an address_line1 that does not validate in Smarty ("221 N Wall St").
-- Smarty validates "221 N Hamilton St" with DPV=Y and provides ZIP+4 + coords.
--
-- We preserve the original line in metadata.

BEGIN;

UPDATE app.agency_offices ao SET
  address_validation_metadata = COALESCE(ao.address_validation_metadata, '{}'::jsonb)
    || CASE WHEN (ao.address_validation_metadata ? 'address_line1_original') IS NOT TRUE
      THEN jsonb_build_object('address_line1_original', ao.address_line1)
      ELSE '{}'::jsonb
    END
    || jsonb_build_object(
      'address_line1_corrected_at', NOW(),
      'address_line1_correction_reason', 'Smarty US Street validated 221 N Hamilton St (DPV=Y)'
    ),
  address_line1 = '221 N Hamilton St',
  updated_at = NOW()
WHERE ao.id = 470
  AND ao.address_line1 = '221 N Wall St';

COMMIT;
