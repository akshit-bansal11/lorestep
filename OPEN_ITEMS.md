# Open items

Register: deferred, accepted, unprovisioned. Delete an entry when it closes.

## Unprovisioned

- `DATABASE_URL_CI` GitHub secret (Neon CI branch, PLAN.md section 9 step 1). Until it exists the
  CI e2e job skips every step with a notice: no browser tests run, and the migration runner has
  never executed. Closes when a push to `main` shows the e2e job migrating, seeding and passing.
- GitHub Environment `production` with a required reviewer. `.github/workflows/migrate.yml` names it,
  and that line enforces nothing until it exists. Closes when the environment is checked in the
  repository settings, not the YAML.

## Deferred

- CI and `migrate.yml` run Node 24, whose support ended 2026-10-20 (CI-D03 wants 26). Out of M1's
  scope. Closes when every workflow's `node-version` is an Active LTS release.
- DB-22 plans for migration 0002 are UNVERIFIED: the expected `EXPLAIN` shape of the hot queries
  (library list, Dogear matching, sync cursor, purge sweep, lists page) is written as comments in
  `db/migrations/0002_log_tables.sql`, never run. Closes when `EXPLAIN` from the CI branch, showing
  each index in use, is attached to the pull request (needs `DATABASE_URL_CI`).

## Accepted

- R1: `sessions.token` is stored raw, against DB-15. The Better-Auth 1.7.18 docs offer no hashed
  session-token storage. Mitigation (DECISIONS.md, signed bearer tokens): only HMAC-signed tokens
  authenticate (`bearer({ requireSignature: true })` and the signed cookie), so a database read
  alone cannot. Closes when Better-Auth ships session-token hashing and it is enabled.
- SEC-07 `__Host-` prefix: the session cookie is `__Secure-better-auth.session_token`, because
  Better-Auth forces the `__Secure-` prefix on secure cookies (DECISIONS.md). Closes when
  Better-Auth supports `__Host-`.
- SEC-19 on `/api/auth/*`: Better-Auth's endpoints rely on its own Origin and Fetch-Metadata checks,
  not Lorestep's double-submit token (PLAN.md section 11 Q3). Closes never by design; revisit if
  Better-Auth's checks are weakened.
- BE-10 wants a token bucket; the app limiter is a fixed window by user decision (PLAN.md D-11).
  Closes if the double burst at a window edge is ever seen in logs.

## Deferred (M3 follow-ups)

- Dogear device sign-in vs signed tokens: `/api/auth/device/token` returns the raw session token,
  which `requireSignature` refuses as a bearer. M13 must return the signed form (for example an
  after hook on `/device/token` that signs `access_token` the way the bearer plugin signs
  `set-auth-token`). Closes when D2's e2e pairs a device and calls `/api/v1/sync`.
- `src/lib/auth/auth-client.ts` (PLAN.md M3 file list) is not written: it has no consumer until
  M4's forms. Closes in M4.
- `rate_limits` and `auth_rate_limits` rows are never deleted. Closes when M12's purge cron removes
  windows older than a day.
- Unverified until CI e2e runs with `DATABASE_URL_CI`: the auth server against Neon (Pool,
  `transaction: true`, model mapping), whether `next start` sets `x-forwarded-for` (if not,
  `/api/v1/auth-providers` answers 403 `ip_unresolved` locally), and the Resend call.

## Deferred (M4, M9 follow-ups)

- Header menu links `/library`, `/lists` and `/account` 404 until M10, M11 and M12 ship. Closes
  when those pages exist.
- `/games` renders `AppHeader`, not `SiteHeader`, so it has no sign-in control. Closes when the
  library UI (M10) settles one header for signed-in pages.
- Metadata and search caches are per serverless instance (best effort, 5 min). Accepted: Neon is
  the only store and the cache only saves provider quota. Revisit if provider limits are hit.
- No IMDb rating on TMDB-link or title-search resolves, and OMDb search hits carry no rating.
  Closes if a resolve path fetches OMDb by IMDb id.
