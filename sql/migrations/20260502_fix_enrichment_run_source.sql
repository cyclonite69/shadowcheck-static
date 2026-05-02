UPDATE app.wigle_import_runs
SET source = 'v3_batch',
    api_version = 'v3'
WHERE source = 'wigle'
  AND api_version = 'v2'
  AND state IS NULL
  AND request_params::jsonb->>'resultsPerPage' = '1';
