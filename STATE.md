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
- N3 done: `auth-client.ts` is `createAuthClient()` from `@neon/auth/next` (a Better Auth React
  client underneath, same method names, so forms and hooks are unchanged); `better-auth` removed
  from `package.json` (lock by the bot). Nothing is deployed from this branch.
- N5 done (see git log). N4 done, not yet in CI: `/oauth/login` (sign-in form whose POST carries
  Neon's `oauth_query`, or Continue = `oauth2.continue` when signed in) and `/oauth/consent`
  (client name from `oauth2.publicClient`, scopes in plain words, Allow/Deny =
  `oauth2.consent`), `continue-oauth.ts` (+test), `e2e/oauth-pages.spec.ts`. Spike decided by
  reading `@neon/auth`: Dogear authorizes and exchanges tokens at the Neon Auth URL, not the
  proxy (DECISIONS.md 2026-11-09). OAuth provider and the Dogear public client are provisioned on
  production (PLAN.md 12.4 steps 6, 7).
- Next: push and read CI for N4; user spike (PLAN.md 12.4 step 11) after N4 reaches production;
  N7 (Dogear, against `docs/EXTENSION.md` "Sign-in"), N8 (review).
- Dogear client contract: `docs/EXTENSION.md`. Routes: `docs/ROUTE-REGISTER.md`.
- CI status: green at `9646ee6` (N2); later commits per the latest Actions run.
- Never executed: all migrations, every SQL statement since M6, Neon Auth calls, every browser
  test. The e2e job skips until `DATABASE_URL_CI` exists, and then needs Neon Auth enabled on the
  CI branch (OPEN_ITEMS.md).
