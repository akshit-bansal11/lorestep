# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`. Plan: `PLAN.md` (section 11 overrides the rest).
- Done: M1, the migration runner. `scripts/migrate.mjs` applies `db/migrations/*.sql` in filename
  order, recorded in `schema_migrations` (migration `0000`). `npm run db:migrate`. Pure helpers in
  `src/lib/db/migrate-order.ts`, unit-tested. Production runs through `.github/workflows/migrate.yml`.
- CI e2e now migrates and seeds the Neon CI branch (`DATABASE_URL_CI`) and runs against it. Until that
  secret exists the job skips with a notice, so no browser tests run (see `OPEN_ITEMS.md`).
- Unverified until CI runs with the secret: the runner itself (Neon WebSocket `Pool`, Node type
  stripping of the `.ts` helper import).
- Next: M2, migration `0001` (auth and limiter tables), its own commit.
