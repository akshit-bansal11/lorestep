-- Which files in db/migrations have been applied. scripts/migrate.mjs records each name in the
-- same transaction as the migration itself. Re-runnable (DB-D06).
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
