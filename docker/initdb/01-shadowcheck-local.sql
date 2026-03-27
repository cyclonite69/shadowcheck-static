DO
$$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shadowcheck_admin') THEN
    CREATE ROLE shadowcheck_admin LOGIN;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION shadowcheck_user;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA app;

GRANT CONNECT ON DATABASE shadowcheck_db TO shadowcheck_admin;
GRANT USAGE ON SCHEMA app TO shadowcheck_admin;
GRANT USAGE ON SCHEMA public TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app TO shadowcheck_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO shadowcheck_admin;

ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA app
  GRANT SELECT ON TABLES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA app
  GRANT USAGE ON SEQUENCES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA app
  GRANT EXECUTE ON FUNCTIONS TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO shadowcheck_user;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowcheck_admin IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO shadowcheck_user;

ALTER ROLE shadowcheck_user SET search_path = app, public;
ALTER ROLE shadowcheck_admin SET search_path = app, public;
