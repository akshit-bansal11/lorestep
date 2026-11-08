# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`. Plan: `PLAN.md` (section 11 overrides the rest).
- Done, CI-green at `7e31244`: M1 (migration runner, `npm run db:migrate`, production via
  `.github/workflows/migrate.yml`), M2 (migration `0001_auth_tables`), M3 (Better-Auth server in
  `src/lib/auth/auth.ts`, guards `requireUser` / `assertSameOrigin` / `clientIp` / `rateLimit`,
  routes in `docs/ROUTE-REGISTER.md`).
- Done, unpushed: M5. Migration `0002_log_tables` (+down) creates `entries`, `entry_links`,
  `lists`, `list_items` per PLAN.md section 4, mirrored in `src/lib/db/schema.ts`. Expected
  `EXPLAIN` shapes are SQL comments, unverified (OPEN_ITEMS.md).
- In flight in the same tree: M4 (auth UI) and M9 (metadata, search, resolve-link).
- Unverified until CI runs: typecheck, lint and format of M5 (never run locally), and everything
  DB-backed: neither migration has ever been applied (the e2e job skips until `DATABASE_URL_CI`).
- Next: push and read CI; then M6 (entries domain, status mapper and its round-trip test). M13
  must give Dogear a signed device token (OPEN_ITEMS.md).
