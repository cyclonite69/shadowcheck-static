-- Add 'surveillanceScan' to background_job_runs job_name check constraint.
-- The constraint previously only allowed: backup, mlScoring, mvRefresh, siblingDetection.

ALTER TABLE app.background_job_runs
  DROP CONSTRAINT background_job_runs_job_name_check;

ALTER TABLE app.background_job_runs
  ADD CONSTRAINT background_job_runs_job_name_check
  CHECK (job_name = ANY (ARRAY[
    'backup'::text,
    'mlScoring'::text,
    'mvRefresh'::text,
    'siblingDetection'::text,
    'surveillanceScan'::text
  ]));

SELECT '20260507_add_surveillance_scan_job_name.sql' AS migration,
       'background_job_runs_job_name_check updated to include surveillanceScan' AS result;
