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
- M6 entries SQL is UNVERIFIED against Postgres: the raw `INSERT ... SELECT` (untyped params
  with casts), the `ON CONFLICT (user_id, game_id) WHERE ...` upsert on the partial index, and the
  `updated_at::text` cursor. Unit tests mock the database. Closes when a DB-backed test runs them
  on the CI branch (needs `DATABASE_URL_CI`).

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

- Unverified until CI e2e runs with `DATABASE_URL_CI`: the auth server against Neon (Pool,
  `transaction: true`, model mapping), whether `next start` sets `x-forwarded-for` (if not,
  `/api/v1/auth-providers` answers 403 `ip_unresolved` locally), and the Resend call.

## Deferred (M4, M9 follow-ups)

- `/games` renders `AppHeader`, not `SiteHeader`, so it has no sign-in control. Closes when the
  library UI (M10) settles one header for signed-in pages.
- Metadata and search caches are per serverless instance (best effort, 5 min). Accepted: Neon is
  the only store and the cache only saves provider quota. Revisit if provider limits are hit.
- No IMDb rating on TMDB-link or title-search resolves, and OMDb search hits carry no rating.
  Closes if a resolve path fetches OMDb by IMDb id.

## Deferred (M7 follow-ups)

- M7 import SQL is UNVERIFIED against Postgres: `INSERT ... SELECT FROM jsonb_to_recordset ...
  ORDER BY ... LIMIT ... ON CONFLICT (user_id, game_id) WHERE ... DO NOTHING`. Unit tests mock the
  database and only assert the statement's shape and the counts. Closes when `e2e/import.spec.ts`
  passes on the CI branch (needs `DATABASE_URL_CI`, and the catalog seeded there).
- Signed in, "Clear all" clears only the local cache, not the account; the next session start
  pulls the marks back. Closes when clearing is either disabled signed in or sent to the account.
- Sync runs per tab: a second open tab does not see the other's account switch or queue until it
  reloads. Accepted for now; closes if a `storage` listener on `isitcanon/import/v1` is added.
- Planned and on-hold game marks (from the library or Dogear) are left out of the games-table
  cache, as the table has no ids for them yet. Closes when the table shows them read-only (M10).

## Deferred (M12 follow-ups)

- `CRON_SECRET` is unprovisioned: until it is set in the Vercel project, `/api/cron/purge` answers
  401 to Vercel Cron and nothing is purged. Closes when a Vercel cron log shows a 200.
- M12 erase and purge SQL is UNVERIFIED against Postgres: data-modifying CTEs over every user
  table, `strpos(bucket, ':<userId>:')` on `rate_limits`, the `verifications.value = user id` match for reset
  tokens, and the counts row. Unit tests mock the database and assert the statement's shape. The
  SEC-22 end-to-end check (zero rows left for the user, other users untouched) is
  `e2e/account.spec.ts` plus a DB-backed row count, neither run yet. Closes when both pass on the
  CI branch (needs `DATABASE_URL_CI`).
- DPDP inactivity retention (SECURITY-SPEC SEC-23): personal data must not be kept past one year
  of inactivity, with 48 hours' notice before erasure; core obligations apply about May 2027 (18
  months from the DPDP Rules' notification on 14 November 2025). Not built: no last-active column
  and no notice mail. Closes when an inactivity sweep with notice ships before that date.
- DB-12 orphan sweep (the alerting backstop for erase) is not built. Closes when a sweep reports
  rows owned by a missing user instead of deleting them.
- Export covers profile, entries, links, lists and items; it leaves out session device metadata
  (user agent, IP). Closes if an access request asks for it.

## Deferred (M13 follow-ups)

- Dogear pairing is UNVERIFIED end to end: the `/device/token` after hook (signed `access_token`,
  session row marked `client = 'dogear'`) relies on Better-Auth 1.7.18 keeping the endpoint's JSON in
  `context.returned`; the hook and the signature format are unit-tested with a mocked adapter. The M13 e2e (approve a code in the
  browser, exchange it over `request`, push and pull a mark) is not written. Closes when that e2e
  passes on the CI branch (needs `DATABASE_URL_CI`) or D2's live pairing calls `/api/v1/sync`.
- M13 sync SQL is UNVERIFIED against Postgres: the D-15 keep expression (`EXISTS` over
  `list_items` join `lists`), the `(updated_at, id) >` keyset, `coalesce(excluded.url, ...)` in the
  link upsert, and the batch as one transaction. Unit tests mock the database. Closes with the e2e
  above.
- Sync pull can miss a write whose transaction commits with an `updated_at` earlier than a cursor
  already handed out (keyset on a commit-order-free clock). Closes if Dogear shows stale marks, by
  adding an overlap window to the cursor.
- Sync push checks the 5000-entry cap by a read before the batch; two concurrent pushes can pass it
  by a few rows. Accepted (one Dogear per browser, 60 pushes a minute).
