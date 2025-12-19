\echo 'Drop default on networks.type to prevent silent fact invention'

-- Up migration
ALTER TABLE public.networks
  ALTER COLUMN type DROP DEFAULT;

-- Down migration (reversible)
-- ALTER TABLE public.networks
--   ALTER COLUMN type SET DEFAULT 'W';
