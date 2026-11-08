# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`. Plan: `PLAN.md` (section 11 overrides the rest).
- Done: M1 (migration runner, `npm run db:migrate`, production via `.github/workflows/migrate.yml`)
  and M2 (migration `0001_auth_tables`, mirrored in `src/lib/db/schema.ts`).
- Done, unpushed CI: M3. `src/lib/auth/auth.ts` `getAuth()` builds Better-Auth lazily (Drizzle
  adapter on a Neon WebSocket Pool, `transaction: true`; Argon2id from `node:crypto`; 30-day
  absolute sessions; signed bearer only; device authorization for client `dogear`; database
  rate limit). Breached-password check fails open in a before hook. Guards: `requireUser`,
  `assertSameOrigin` (Origin + JSON + double-submit CSRF), `clientIp`, `rateLimit` (fixed window).
  Routes: `/api/auth/*`, `GET /api/v1/auth-providers`, `GET /api/v1/csrf`
  (`docs/ROUTE-REGISTER.md`). Unit tests for password, CSRF check, client IP, limiter, guard, hook.
- Unverified until CI runs: typecheck and lint of M3 (never run locally), the Argon2id tests on
  CI's Node, and everything DB-backed (the e2e job skips until `DATABASE_URL_CI` exists).
- Next: push and read CI; then M4 (auth UI; adds `src/lib/auth/auth-client.ts`). M13 must give
  Dogear a signed device token (OPEN_ITEMS.md).
