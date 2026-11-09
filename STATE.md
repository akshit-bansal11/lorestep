# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 12, Neon Auth,
  overrides the rest).
- Done: M1-M13 (Better-Auth era); N1 (`@neon/auth` 0.8.2, `jose`, `neon-auth.ts`,
  `verify-dogear-token.ts`); N2 server cutover: migrations 0001 (`rate_limits` only) and 0002
  (uuid `user_id`, FK to `neon_auth."user"`), migrate runner refuses a branch without Neon Auth,
  schema `neonAuthUser`, cookie-only `requireUser` (503 on Neon errors), bearer-JWT-only sync,
  `/api/auth/[...path]` Neon proxy behind a fail-closed per-IP limiter, account sessions, export
  and erase on Neon Auth, purge without auth tables, `/device` and `POST /api/v1/sync/sign-out`
  deleted. DECISIONS.md "Neon Auth replaces Better-Auth"; ledger in OPEN_ITEMS.md Accepted.
- Not functional between N2 and N3: the sign-in UI (`auth-client.ts`, auth forms, `DevicesList`,
  `AccountMenu`, `use-entries-sync.ts`) still uses the `better-auth` client; `better-auth` stays
  installed until N3. Nothing is deployed from this branch.
- Next: push and read CI for N2; then N3 (UI on the `@neon/auth` client, remove `better-auth`),
  N5 (CI env, `migrate.yml`, PR #8 mirror of `db/migrations/0001*`, `0002*`, `scripts/migrate.mjs`
  byte-identical), N6, then N4 (OAuth pages and authorize spike), N7 (Dogear), N8 (review).
- Dogear client contract: `docs/DOGEAR.md`. Routes: `docs/ROUTE-REGISTER.md`.
- CI status: green at `ca2c987` (N1). N2 commits not yet run in CI.
- Never executed: all migrations, every SQL statement since M6, Neon Auth calls, every browser
  test. The e2e job skips until `DATABASE_URL_CI` exists, and then needs Neon Auth enabled on the
  CI branch (OPEN_ITEMS.md).
