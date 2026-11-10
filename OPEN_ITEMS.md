# Open items

Register: deferred, accepted, unprovisioned. Delete an entry when it closes.

## Unprovisioned

- `EXTENSION_OAUTH_CLIENT_ID` in Vercel (value `QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX`, public). Closes when a
  production sync call from the extension returns 200.
- Archive or delete the old `akshit-bansal11/dogear` repo after this PR merges (owner).
- First green e2e run against Neon. Provisioned 2026-11-09: secrets `DATABASE_URL_CI` and
  `NEON_AUTH_BASE_URL_CI`; the `ci` branch was created after Neon Auth was enabled on
  `production` (so it inherits Auth and holds no old migrations); environment
  `production-migrations` has a required reviewer (checked via the GitHub API). Never yet run:
  `scripts/migrate.mjs`, any SQL since M6, any Neon Auth call. Closes when the e2e job migrates,
  seeds and passes on the `ci` branch.
- Neon Auth env (`NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `APP_ORIGIN`, `AUTH_PROVIDERS`,
  `AUTH_RESET`) in the Vercel project; `NEON_AUTH_ISSUER` stays unset (issuer verified equal to
  the base URL, Accepted below). The old `BETTER_AUTH_*`, `GITHUB_*`, `GOOGLE_*`, `RESEND_API_KEY`,
  `MAIL_FROM` removed. Closes when a deploy signs a user in.
- N4 authorize round trip (PLAN.md 12.4 step 11): Neon authorize -> `/oauth/login` -> `/oauth/consent`
  -> `chromiumapp.org/?code=` never observed; the choice of the Neon URL over the proxy rests on
  reading `@neon/auth` 0.8.2's proxy (`redirect: "follow"`). Also UNVERIFIED: that the server
  `neonAuth().oauth2.publicClient` forwards the session cookie. Closes when the user spike lands on
  the redirect with a `code`.
- `TMDB_BEARER_TOKEN` (or `TMDB_API_KEY`) and `MAL_CLIENT_ID` in Vercel production. Without them
  the enrichment after a push and the `/api/cron/enrich` sweep do nothing, so synced entries get no
  year or poster and Netflix anime stays kind series. Closes when a cron run reports `filled > 0`.
- Migration `0003_entries_enriched_at` on production: run the gated "Migrate production" workflow
  before or with the deploy that ships `entries.enriched_at`, or every whole-row read of `entries`
  (account export, enrichment) fails on the missing column. Closes when the workflow run is green.

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

- N2 Neon Auth wiring is UNVERIFIED against a live instance: `getSession`/`listSessions`/
  `revokeSession({ token })`/`signOut()` called server-side without a request argument (they
  read the cookie through `next/headers`), and Date fields arriving as strings over the proxy.
  Unit tests mock `neonAuth()`. Closes when the e2e (sign-up, sessions list, revoke, erase)
  passes on the CI branch and a real extension token passes `requireBearerUser`.

- The `/api/auth/*` path allowlist (`AUTH_PROXY_PATHS`, docs/ROUTE-REGISTER.md) was derived by
  reading `@neon/auth` 0.8.2's client and every `authClient` call in `src/`. UNVERIFIED live:
  that social sign-in callbacks and password-reset links land on the Neon Auth URL and never on
  the proxy, and that `useSession` needs only GET `get-session`. A blocked path answers 404
  `not_found`. Closes when the e2e passes on the CI branch and a manual GitHub or Google sign-in
  and a reset link work on production.

- Erase deletes `neon_auth."user"` directly (DECISIONS.md), because Neon's `deleteUser()` answers
  404 `user_not_found` (Better Auth's hidden endpoint while `user.deleteUser.enabled` is off),
  plus the user's rows in every `neon_auth` table with a user-id column that does not cascade
  (found from the catalog at erase time). UNVERIFIED: that the app's database role may SELECT the
  catalog and DELETE in `neon_auth`, and that Neon Auth keeps no user state outside its tables.
  `scripts/migrate.mjs` prints every user-id table and its FK delete rule. Closes when
  e2e/account.spec.ts passes on the CI branch. Revisit (switch back to the API) when Neon exposes
  delete-user or an admin delete API.
- README screenshots, the `assets/*` logos and `src/app/opengraph-image.png` still show the old warm palette. Closes when they are regenerated in the dark Plotline palette.
- No skip link exists (UI-25; spotted, not fixed). Closes when a skip link is added and tested.
- Like/dislike, per-item detail panels, and the extension showing a title's place in story order are planned and not built. Closes when each is built or dropped from the plan.
- TMDB and IGDB keys are needed for synopses and posters. Closes when both are provisioned.

## Accepted

- Auth is Neon-managed (DECISIONS.md, "Neon Auth replaces Better-Auth"); these properties are
  Neon's and cannot be verified here (PLAN.md section 12.2):
  - SEC-05 password hashing algorithm and cost: undocumented. Revisit when Neon documents it or a
    security review needs it.
  - SEC-06 breached-password check and password length policy: undocumented; the app form keeps
    min 15 / max 128 as client-side advice only. Revisit as SEC-05.
  - SEC-07 cookie is `__Secure-neon-auth.session_token`, not `__Host-`; `SameSite=Lax` is ours
    (`neon-auth.ts`), `HttpOnly`/`Secure` are Neon's, to be checked in browser dev tools after
    N3 (PLAN.md 12.4 step 12). Revisit when Neon supports `__Host-`.
  - SEC-08 session lifetime, idle timeout, rotation and revocation on password change: not
    configurable or documented. Revisit when documented.
  - SEC-10/11 enumeration responses and sign-up copy are Neon-defined; the e2e asserts only the
    observable part (same message for wrong password and unknown email). Revisit if Neon
    changes them.
  - SEC-19 on `/api/auth/*`: Neon's trusted-domains Origin allowlist replaces our checks.
    Production origin only; previews cannot sign in (PLAN.md 12.4 step 2). Revisit if previews
    need auth.
  - SEC-20 auth endpoint rate limits are undocumented on Neon's side; compensated (not proven)
    by our `withAuthLimit` in front of the proxy (per IP, IPv6 by /64; per path; per hashed
    email and IP plus per hashed email). Revisit when Neon documents its limits.
  - DB-15 credential storage: tokens and hashes live in Neon-managed tables we never read
    (closes the old R1 as "not ours"). Revisit if the app ever reads `neon_auth`.
  - Auth event audit log: Neon Console only. Revisit if an incident review needs it.
  - Extension token revocation: no revocation endpoint is documented and deleting the OAuth client
    does not revoke issued tokens; a stolen refresh token lives up to 30 days (access JWT about
    1 h). Mitigation: tokens only in the worker's IndexedDB (content scripts cannot reach it),
    never logged, refresh rotates, redirects refused on token and API fetches.
    UNVERIFIED whether a password change or `revokeOtherSessions` invalidates grants. Revisit
    when Neon documents grant revocation or a per-user grant list; then add "Connected apps"
    to `/account`.
  - Availability: a Neon Auth outage means no sign-in and 503 `auth_unavailable` on session
    routes; signed-out tracking is unaffected. A revoked session can still read as signed in for
    up to 60 s (`sessionDataTtl`). Revisit if outages are seen.
  - SEC-22 erasure is one statement of ours (app data, the user's rows in every non-cascading
    `neon_auth` user-id table, and the `neon_auth."user"` row); the proof
    is the e2e (sign-in fails after erase). Other devices of an erased user can still read as
    signed in from the session-data cookie cache for up to `sessionDataTtl` (60 s); every write
    then fails on the missing user. Accepted. Revisit if the TTL is raised.
- Extension token issuer: VERIFIED 2026-11-09, the production `openid-configuration` `issuer`
  equals `NEON_AUTH_BASE_URL` exactly, so `NEON_AUTH_ISSUER` is not needed (`authIssuer()` keeps
  the override for a future mismatch). Revisit if Neon changes its issuer format.
- `neon_auth."user".id` is uuid: VERIFIED by SQL on production (2026-11-09). Its other columns
  are camelCase and quoted (`"emailVerified"`, `"createdAt"`); the app never selects them.
  Revisit if a query ever reads `neon_auth`.
- BE-10 wants a token bucket; the app limiter is a fixed window by user decision (PLAN.md D-11).
  Closes if the double burst at a window edge is ever seen in logs.

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
  table, `strpos(bucket, ':<userId>:')` on `rate_limits`, the `::uuid` user id casts, the
  `neon_auth."user"` delete in the same statement, and the counts row. Unit tests mock the database and assert the statement's shape. The
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

- M13 sync SQL is UNVERIFIED against Postgres: the D-15 keep expression (`EXISTS` over
  `list_items` join `lists`), the `(updated_at, id) >` keyset, `coalesce(excluded.url, ...)` in the
  link upsert, and the batch as one transaction. Unit tests mock the database. Closes when a
  DB-backed sync test runs on the CI branch (needs `DATABASE_URL_CI`).
- Sync pull can miss a write whose transaction commits with an `updated_at` earlier than a cursor
  already handed out (keyset on a commit-order-free clock). Closes if Dogear shows stale marks, by
  adding an overlap window to the cursor.
- Sync push checks the 5000-entry cap by a read before the batch; two concurrent pushes can pass it
  by a few rows. Accepted (one Dogear per browser, 60 pushes a minute).
