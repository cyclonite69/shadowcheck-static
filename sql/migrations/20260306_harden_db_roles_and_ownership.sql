-- Harden DB roles and ownership model
-- Goal:
-- 1) Make shadowcheck_admin owner of app/public objects (best effort)
-- 2) Keep shadowcheck_user read-only except explicit auth/session exceptions
--
-- Notes:
-- - This migration contains no secrets and does not persist credentials.
-- - Ownership transfer may require elevated DB privileges; insufficient-privilege
--   cases are logged as NOTICE and skipped so migration remains rerunnable.

-- -----------------------------------------------------------------------------
-- 0) Preconditions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shadowcheck_admin') THEN
    RAISE EXCEPTION 'Role shadowcheck_admin does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shadowcheck_user') THEN
    RAISE EXCEPTION 'Role shadowcheck_user does not exist';
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 1) Ownership transfer to shadowcheck_admin (best effort)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  obj RECORD;
BEGIN
  BEGIN
    EXECUTE 'ALTER SCHEMA app OWNER TO shadowcheck_admin';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping ALTER SCHEMA app OWNER TO shadowcheck_admin (insufficient privilege)';
  END;

  BEGIN
    EXECUTE 'ALTER SCHEMA public OWNER TO shadowcheck_admin';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping ALTER SCHEMA public OWNER TO shadowcheck_admin (insufficient privilege)';
  END;

  -- Tables, partitioned tables, views, materialized views, sequences, foreign tables
  FOR obj IN
    SELECT n.nspname AS schemaname, c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'public')
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  LOOP
    BEGIN
      IF obj.relkind IN ('r', 'p') THEN
        EXECUTE format('ALTER TABLE %I.%I OWNER TO shadowcheck_admin', obj.schemaname, obj.relname);
      ELSIF obj.relkind = 'v' THEN
        EXECUTE format('ALTER VIEW %I.%I OWNER TO shadowcheck_admin', obj.schemaname, obj.relname);
      ELSIF obj.relkind = 'm' THEN
        EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO shadowcheck_admin', obj.schemaname, obj.relname);
      ELSIF obj.relkind = 'S' THEN
        EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO shadowcheck_admin', obj.schemaname, obj.relname);
      ELSIF obj.relkind = 'f' THEN
        EXECUTE format('ALTER FOREIGN TABLE %I.%I OWNER TO shadowcheck_admin', obj.schemaname, obj.relname);
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping ownership transfer for %.% (insufficient privilege)', obj.schemaname, obj.relname;
    END;
  END LOOP;

  -- Functions/procedures
  FOR obj IN
    SELECT n.nspname AS schemaname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS identity_args,
           p.prokind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'public')
  LOOP
    BEGIN
      IF obj.prokind = 'p' THEN
        EXECUTE format(
          'ALTER PROCEDURE %I.%I(%s) OWNER TO shadowcheck_admin',
          obj.schemaname,
          obj.proname,
          obj.identity_args
        );
      ELSE
        EXECUTE format(
          'ALTER FUNCTION %I.%I(%s) OWNER TO shadowcheck_admin',
          obj.schemaname,
          obj.proname,
          obj.identity_args
        );
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping routine ownership transfer for %.%(%) (insufficient privilege)',
          obj.schemaname,
          obj.proname,
          obj.identity_args;
    END;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 2) Tighten shadowcheck_user permissions
-- -----------------------------------------------------------------------------
-- Prevent object creation by shadowcheck_user.
REVOKE CREATE ON SCHEMA app FROM shadowcheck_user;
REVOKE CREATE ON SCHEMA public FROM shadowcheck_user;

-- Reset table/sequence/function privileges, then grant back read-only policy.
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM shadowcheck_user;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM shadowcheck_user;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM shadowcheck_user;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM shadowcheck_user;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM shadowcheck_user;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM shadowcheck_user;

GRANT USAGE ON SCHEMA app TO shadowcheck_user;
GRANT USAGE ON SCHEMA public TO shadowcheck_user;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO shadowcheck_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO shadowcheck_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO shadowcheck_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO shadowcheck_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO shadowcheck_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO shadowcheck_user;

-- Auth/session exceptions needed by runtime auth flows.
GRANT INSERT, UPDATE, DELETE ON TABLE app.user_sessions TO shadowcheck_user;
GRANT UPDATE (last_login) ON TABLE app.users TO shadowcheck_user;

-- -----------------------------------------------------------------------------
-- 3) Ensure shadowcheck_admin has full schema/object privileges
-- -----------------------------------------------------------------------------
GRANT CONNECT ON DATABASE shadowcheck_db TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO shadowcheck_admin;

-- -----------------------------------------------------------------------------
-- 4) Default privileges for future objects (created by shadowcheck_admin)
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA app
  GRANT SELECT ON TABLES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA app
  GRANT USAGE ON SEQUENCES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA app
  GRANT EXECUTE ON FUNCTIONS TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO shadowcheck_user;

SELECT 'db_role_hardening_complete' AS status;
