# Decisions

Append only (`.claude/CLAUDE.md` section 19). Context / options / choice / consequence / revisit when.

## 2026-11-08 Migrations are plain SQL run by a script

- Context: user tables need migrations that survive schema changes; `seed-db.mjs` drops and
  rebuilds the catalog tables, so it cannot own them.
- Options: drizzle-kit `generate` + `migrate`; plain SQL files with a small runner.
- Choice: `db/migrations/NNNN_name.sql` + `NNNN_name.down.sql`, applied by `scripts/migrate.mjs`,
  tracked in `schema_migrations`. drizzle-kit rejected: `generate` needs a local node run, which is
  forbidden here, and hand-written snapshots drift.
- Consequence: `src/lib/db/schema.ts` is kept in step with the SQL by hand; only the CI e2e run
  catches drift. Each file runs in one transaction with its record, over the Neon WebSocket `Pool`
  (neon-http has no transactions and one statement per request). `--down` reverts only the newest
  applied migration.
- Revisit when: schema drift between SQL and `schema.ts` causes a real bug, or local node runs
  become possible.

## 2026-11-08 Migration helpers live in TypeScript under src/

- Context: the ordering and validation helpers must be unit-tested by Vitest and typechecked, and
  `tsconfig.json` has `allowJs: false`, so a test cannot import them from `scripts/migrate.mjs`.
- Options: export them from the `.mjs` plus a hand-written `.d.ts`; a `.ts` module the script imports.
- Choice: `src/lib/db/migrate-order.ts`, imported by the script through Node's type stripping
  (erasable syntax only, no imports).
- Consequence: the file must stay free of enums, namespaces, parameter properties and `@/` imports.
- Revisit when: the script needs a non-erasable TypeScript feature.

## 2026-11-08 Lockfile regenerated in CI and committed to the feature branch

- Context: M3 adds `better-auth` and `zod`; `package-lock.json` must change, and npm cannot run on
  the owner's machine. `workflow_dispatch` only works once a workflow exists on `main`.
- Options: a lockfile PR into the feature branch (the portfolio pattern); commit straight to the
  feature branch.
- Choice: `.github/workflows/lockfile.yml` runs on any non-main push that changes `package.json`
  (and manually once on `main`), runs `npm install --package-lock-only --ignore-scripts`, and
  commits the lockfile to that branch. It refuses `main`.
- Consequence: a bot commit lands on the branch after each `package.json` change; pull before the
  next commit. GITHUB_TOKEN pushes do not trigger CI, so the next human push is the one CI checks.
- Revisit when: dependency review needs its own PR, or Dependabot takes over lockfile updates.

## 2026-11-08 Argon2id from node:crypto, stored as a PHC string

- Context: SEC-05 wants Argon2id at 64 MiB, t=3, p=1; Better-Auth defaults to scrypt; no new
  dependency is allowed (PLAN.md D-6).
- Options: `node:crypto` `argon2` (Node 24.7+); `@node-rs/argon2` (pre-authorised fallback);
  Better-Auth's scrypt.
- Choice: `node:crypto` `argon2("argon2id", ...)`, 16-byte random salt, 32-byte tag, stored as
  `$argon2id$v=19$m=65536,t=3,p=1$<salt>$<tag>`, verified with `timingSafeEqual` using the
  parameters read from the stored string. `@types/node` 26.2.0 declares it (`@since v24.7.0`,
  marked experimental); CI's `node-version: 24` resolves the newest 24.x. `package.json` pins
  `engines.node >=24.7` so Vercel runs a Node that has it. scrypt rejected (SEC-05); the
  `@node-rs/argon2` fallback was not needed.
- Consequence: the API is experimental in Node and could change shape in a later major. Hashes
  carry their parameters, so raising the cost later needs no migration.
- Revisit when: Node marks `crypto.argon2` stable or changes it, or Vercel stops honouring
  `engines.node`.

## 2026-11-08 Sessions: 30 days absolute, Better-Auth's __Secure- cookie

- Context: SEC-07 wants `HttpOnly; Secure; SameSite=Lax` and `__Host-` where a sibling subdomain
  must not set the cookie; SEC-08 wants an absolute cap and other sessions ended on a password
  change (PLAN.md D-7, section 11 Q4).
- Options: Better-Auth's cookie as configured; a renamed `__Host-` cookie.
- Choice: `session.expiresIn` 30 days with `disableSessionRefresh: true` (no rolling extension),
  no cookie cache (revocation is immediate). `revokeSessionsOnPasswordReset: true`, and a before
  hook forces `revokeOtherSessions: true` on `/change-password`. The cookie stays Better-Auth's
  `__Secure-better-auth.session_token` (HttpOnly, Secure in production, SameSite=Lax, Path=/, no
  Domain). `__Host-` rejected: Better-Auth prepends `__Secure-` to every secure cookie name
  (`createCookieGetter` in 1.7.18), so a custom name would become `__Secure-__Host-...`.
- Consequence: partial deviation from SEC-07: the cookie is host-only (no Domain attribute) but the
  browser does not enforce that, so a sibling subdomain could plant a same-name cookie.
  `akshitbansal.dev` subdomains are all the owner's.
- Revisit when: Better-Auth supports the `__Host-` prefix, or a subdomain is ever served by
  someone else.

## 2026-11-08 Signed bearer tokens only; raw session tokens accepted in the database

- Context: Better-Auth stores `sessions.token` raw (DB-15 wants a hash); the 1.7.18 docs offer no
  hashed session-token storage (PLAN.md R1, section 11 Q2).
- Options: accept raw storage with signed tokens; hand-roll a session layer (forbidden by Q2).
- Choice: `bearer({ requireSignature: true })` and the default HMAC-signed cookie, so a token read
  from the database cannot authenticate without `BETTER_AUTH_SECRET`. Also
  `verification.storeIdentifier: "hashed"` (reset and other verification tokens, SEC-09) and
  `account.encryptOAuthTokens: true`.
- Consequence: accepted deviation from DB-15 (OPEN_ITEMS.md R1). The device plugin's
  `/device/token` returns the raw `session.token` as `access_token` (routes.ts in 1.7.18), which
  `requireSignature` then refuses: M13 must hand Dogear a signed token (OPEN_ITEMS.md).
- Revisit when: Better-Auth ships session-token hashing.

## 2026-11-08 Enumeration: uniform login and reset, sign-up says the email is taken

- Context: SEC-10/SEC-11 and API-07; email verification is optional because Resend may be absent
  (PLAN.md D-18).
- Options: full resistance (`autoSignIn: false` or required verification, so sign-up always 200);
  surface "already registered" at sign-up.
- Choice: sign-up surfaces it (`autoSignIn` left on, no required verification). Login is uniform:
  Better-Auth answers the same error for an unknown email and a wrong password and hashes the
  submitted password for unknown emails (decoy work through our Argon2id `hash`). Reset is uniform:
  Better-Auth runs a dummy token for unknown addresses, and the email is sent after the response
  (`after()`) and never throws, so neither timing nor errors reveal a registered address.
- Consequence: an attacker can test whether an address is registered through sign-up, limited to
  3 per 10 minutes per IP (`AUTH_RATE_RULES`). Sign-up can show real password-policy errors.
- Revisit when: email verification becomes mandatory (Resend always configured).

## 2026-11-08 Password reset: 1 hour token, Resend REST, 503 without mail

- Context: SEC-09 wants a recorded finite reset-token TTL; there is no TECH-STACK.md in this repo,
  so the value is recorded here and in `RESET_TOKEN_TTL_SEC`. Resend may be absent (PLAN.md M3).
- Options: Resend SDK; `fetch` to the REST API.
- Choice: 3600 s (`resetPasswordTokenExpiresIn`), stored hashed and single-use by Better-Auth.
  Email via `fetch` to `https://api.resend.com/emails` (no SDK). Without `RESEND_API_KEY` and
  `MAIL_FROM`, a before hook answers `/request-password-reset` with 503 `reset_unavailable`.
- Consequence: a reset link expires after an hour.
- Revisit when: users report links expiring before they act.

## 2026-11-08 Breached-password check in a hook, failing open, instead of the HIBP plugin

- Context: SEC-06 wants every new password checked against a breach list, failing open and logged
  when the provider is unreachable. PLAN.md D-2 named Better-Auth's `haveIBeenPwned()` plugin.
- Options: the plugin; Better-Auth's exported `isPasswordCompromised` from a `hooks.before`.
- Choice: the hook (`src/lib/auth/auth-hooks.ts`) on `/sign-up/email`, `/change-password`,
  `/reset-password`, `/set-password`. Plugin rejected: it throws a 500 when the service is down
  (fails closed) and has no option to change that (`plugins/haveibeenpwned/index.ts`, 1.7.18).
- Consequence: an HIBP outage lets an unchecked password through, logged with `console.warn`.
- Revisit when: the plugin offers a fail-open option.

## 2026-11-08 Auth runs on a Neon WebSocket Pool

- Context: Better-Auth spends the reset token, revokes sessions and saves the password in one
  transaction only when the Drizzle adapter has `transaction: true`; neon-http has no
  transactions (PLAN.md R2, section 11).
- Options: neon-http without transactions; `drizzle-orm/neon-serverless` `Pool`.
- Choice: `authDb()` (Pool) for the adapter only, built once with the lazily created auth server;
  catalog reads keep neon-http `db()`. Model names are the Drizzle schema keys (`users`,
  `deviceCodes`, `authRateLimits`, ...), which is how the adapter finds each table.
- Consequence: one long-lived Pool per warm function instance. Unverified until CI e2e runs.
- Revisit when: Vercel connection limits or idle-socket errors show up in logs.

## 2026-11-08 CSRF: double-submit token on Lorestep's own cookie routes

- Context: SEC-19 wants a CSRF token and an Origin check on every cookie-authenticated mutating
  route. PLAN.md D-17 (Origin + JSON only, no token) was superseded by section 11 Q3.
- Options: Origin + JSON content type only; add a double-submit token; a session-bound HMAC token.
- Choice: `assertSameOrigin` checks exact `Origin` against `BETTER_AUTH_URL`'s origin, a JSON
  content type, and `x-csrf-token` equal to the `__Host-csrf` cookie (32 random bytes, HttpOnly,
  Secure, SameSite=Strict, issued and reused by `GET /api/v1/csrf`) in constant time. Bearer
  callers skip it. `/api/auth/*` keeps Better-Auth's own Origin and Fetch-Metadata checks: the one
  recorded SEC-19 deviation (OPEN_ITEMS.md). Session-bound HMAC rejected as more code than the
  Origin check plus SameSite=Lax already leaves room for.
- Consequence: every M6+ mutating cookie route calls `assertSameOrigin` after `requireUser` when
  `via` is `session`; the client fetches the token once per page load.
- Revisit when: a route must accept a cross-origin form post, or the token leaks into logs.

## 2026-11-08 App rate limiter: Postgres fixed window, failing open

- Context: PLAN.md D-11 (user decision) chose a Postgres fixed-window counter; BACKEND-SPEC BE-10
  wants a token bucket, BE-06 wants limits to fail open.
- Options: fixed window (one atomic upsert); token bucket (read-modify-write or a stored
  function).
- Choice: fixed window, `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`
  over neon-http, bucket key `name:windowSec`, `Retry-After` = seconds to the window's end. On a
  store error the request is allowed and the outage logged (BE-06). The user decision outranks the
  spec; the conflict is recorded in OPEN_ITEMS.md.
- Consequence: a client can spend up to twice the limit across a window edge.
- Revisit when: that double burst matters for a provider quota (M9 metadata/search).

## 2026-11-08 resolve-link reuses the metadata fetchers

- Context: Plotline had separate resolvers per site; M9 ports resolve-link to Lorestep.
- Options: copy Plotline's resolvers; parse the link to a provider id and call the M9 metadata
  fetchers.
- Choice: parse, then reuse the fetchers. One code path per provider, one SSRF guard.
- Consequence: links the fetchers cannot express return 422 `unresolvable`.
- Revisit when: a supported site needs page scraping the fetchers cannot do.

## 2026-11-08 Formatting applied in CI on feature branches

- Context: agents cannot run Biome locally, and every formatter diff failed the gate.
- Options: hand-fix each CI diff; a workflow that formats and commits to the branch.
- Choice: `.github/workflows/format-fix.yml` runs `biome check --write --linter-enabled=false` on
  non-main pushes and commits the result. Lint fixes stay manual; the gate is unchanged.
- Consequence: a bot commit may follow a push; pull before the next commit.
- Revisit when: formatting can run before commit (a hook on a machine that can run node).

## 2026-11-08 Entry create is a raw INSERT ... SELECT

- Context: PLAN.md section 4 wants the 5000-entry cap and the unique keys checked in one statement
  (DB-23); neon-http has no interactive transactions.
- Options: count then insert (racy, read-then-write); drizzle `insert().select()` with a builder
  (every value needs a typed alias, unverifiable without a local typecheck); one raw
  `INSERT ... SELECT ... WHERE (SELECT count(*) ...) < cap RETURNING id`, then a typed re-read.
- Choice: the raw statement, with explicit casts on non-text values. Unique violations (23505)
  answer 409 `duplicate`, CHECK violations (23514) 400, no row back 409 `limit`.
- Consequence: the column list is written by hand and must follow schema changes; two concurrent
  creates at 4999 can both pass (cap overshoot by the concurrency, accepted).
- Revisit when: drizzle's insert-select can express it with typed values, or the cap must be exact.

## 2026-11-08 Entry list cursor carries `updated_at::text`

- Context: keyset paging on `(updated_at, id)`; Postgres stores microseconds, a JS `Date` holds
  milliseconds, so a cursor built from the mapped `Date` would skip or repeat rows.
- Options: truncate to milliseconds in SQL (defeats the index); write only millisecond times;
  carry the database's own text form.
- Choice: select `updated_at::text` beside the row and put it in the opaque base64url cursor,
  compared as `(updated_at, id) < ($at::timestamptz, $id::uuid)`. Decoded cursors are pattern-checked
  before any cast, so a forged one is 400, never a 500.
- Consequence: M13's sync cursor should reuse `utils/log/entry-cursor.ts`.
- Revisit when: never, unless the order key changes.

## 2026-11-08 Signed-in tracker keeps the browser's own marks aside, never deletes them

- Context: PLAN.md M7 has the signed-in cache replaced by the account's marks and cleared on
  sign-out, but local data must never be deleted until the server confirms it, and a "Never"
  answer leaves the browser's marks unimported.
- Options: clear the cache on sign-out (loses "Never" and unsynced marks); keep account marks after
  sign-out (leaks one account's marks to the next person on a shared machine); set the browser's
  marks aside in the `isitcanon/import/v1` record while signed in and put them back on sign-out.
- Choice: the last. The record also queues each edit per user until the server answers 2xx (or
  404, a game not in the catalog), and replays the queue at the next session start.
- Consequence: one storage key holds decisions, the set-aside marks and the queue; queued edits of
  a signed-out account stay in this browser's localStorage (not shown in the UI) until it signs in
  again.
- Revisit when: a signed-in "clear all" or multi-tab sync is wanted.

## 2026-11-08 Lists: item cap, shared write budget, hard item delete

- Context: PLAN.md M8 was silent on how many items a list holds and on the write budget; D-16 makes
  every delete soft, but list items are a membership row, not a sync record.
- Options: no item cap; a separate list-write budget; soft-delete items (a tombstone per removal,
  carried to the purge cron).
- Choice: 500 items per list (`LIST_LIMITS.itemsPerList`); list writes share the entries write
  budget under bucket `lists:<userId>`; removing an item is a hard delete of the membership row.
  Re-adding the title restores it. Dogear does not sync list items, so no tombstone is needed. This
  deviates from D-16 for list items only.
- Consequence: a removed item cannot be undone except by adding it again; the entry itself is
  untouched.
- Revisit when: Dogear or a second device needs to sync list membership, or 500 proves too low.

## 2026-11-08 Undo of a delete restores the row

- Context: M10's undo re-POSTed the deleted entry, which made a new id and lost its Dogear links and
  list memberships.
- Options: keep re-POST; clear `deleted_at` on the tombstone while the purge window allows.
- Choice: `POST /api/v1/entries/:id/restore` clears `deleted_at` within 30 days (404 otherwise, 409
  at the cap or on a title taken meanwhile).
- Consequence: the entry keeps its id, links and list memberships.
- Revisit when: the purge window changes (`ENTRY_LIMITS.restoreWindowDays` must follow it).

## 2026-11-08 Account erase, device sign-out and export bypass Better-Auth's endpoints

- Context: M12 needs erasure (SEC-22, DB-11), per-device sign-out and export.
- Options: Better-Auth `deleteUser` (needs `user.deleteUser.enabled`, a password or fresh session,
  and deletes only Better-Auth's own tables), `listSessions` / `revokeSession` (return and take the
  raw session token); or Lorestep's own routes over the Drizzle tables.
- Choice: own routes. Erase is one statement over `services/account/user-tables.ts` plus the
  user's `rate_limits` and reset `verifications`, guarded on the typed email. Sessions are listed
  by id with display columns only and revoked by `DELETE ... WHERE id AND user_id`. All three
  account routes refuse bearer tokens (403), so the Dogear token cannot export or erase.
- Consequence: no session token reaches the browser; revocation is immediate because no cookie
  cache or secondary storage is configured. Enabling `session.cookieCache` would break that.
- Revisit when: `session.cookieCache` or secondary storage is turned on.

## 2026-11-08 Erase confirms with the account's email, not the word DELETE

- Context: PLAN.md section 5 sketched `{confirm:"DELETE"}`; UX-SPEC UX-05 wants the unique name of
  the object typed for an irreversible action.
- Options: a fixed word; the account's email.
- Choice: the email, compared case-insensitively on the server inside the delete statement.
- Consequence: a mistyped email deletes nothing (400 `confirm_mismatch`).
- Revisit when: accounts can exist without an email.

## 2026-11-08 Dogear's device token is signed by an after hook on /device/token

- Context: Better-Auth 1.7.18's `/device/token` returns `access_token` = the raw session token.
  `bearer({ requireSignature: true })` ignores any bearer without a dot, so Dogear could pair but
  never authenticate. Relaxing `requireSignature` would let a token read from the database
  authenticate (R1).
- Options: relax `requireSignature`; a Lorestep route that repeats the code exchange; a global
  `hooks.after` that rewrites the endpoint's JSON.
- Choice: `afterAuthHook` (`src/lib/auth/auth-hooks.ts`) replaces `access_token` with
  `token.base64(HMAC-SHA256(BETTER_AUTH_SECRET, token))` (`sign-session-token.ts`, node:crypto),
  the exact signed-cookie form better-call 1.4.5 verifies (44-character padded base64), and sets
  the new session's `user_agent` to "Dogear (Chrome)" so `/account` can revoke it by name. Read
  from the 1.7.18 sources: `plugins/bearer/index.ts`, `plugins/device-authorization/routes.ts`,
  `api/dispatch.ts` (`runAfterHooks` keeps `context.returned`), better-call `crypto.mjs`.
- Consequence: Better-Auth still owns the RFC 8628 flow (polling, slow_down, single-use claim).
  The hook depends on `context.returned` being the plain JSON object, which a Better-Auth upgrade
  could change; the round-trip unit test pins only the signature format.
- Revisit when: Better-Auth upgrades past 1.7.x, or ships signed device tokens itself.

## 2026-11-08 Sync routes are bearer only; a Dogear clear keeps entries in a list by external id

- Context: PLAN.md section 5 allowed a session cookie on `GET /api/v1/sync`; the M13 brief says
  sync is bearer only. D-15 keeps a cleared entry that is in a list, but `list_items` has no entry
  id.
- Options: accept cookies on pull; bearer only. For list membership: add an entry id to
  `list_items` (a migration), match by title, or match by `(ext_source, ext_id)`.
- Choice: both sync routes answer 403 `bearer_required` to cookie callers
  (`require-bearer-user.ts`), so they need no CSRF check. List membership = a live list's item with
  the entry's external id. The push is planned by a pure function (`plan-push.ts`) over two
  owner-scoped reads and written in one `db.batch`, with LWW repeated in the UPDATE's WHERE.
- Consequence: the website cannot call sync (it has `/api/v1/entries`). An entry Dogear created
  has no external id, so it is never a list member until the user links one.
- Revisit when: `list_items` gains an entry id, or a browser client needs the change feed.

## 2026-11-09 Sessions carry a client column; authorization classifies by row

- Context: `requireUser` decided `via` from the presence of an `Authorization` header. The signed
  Dogear token is byte-identical to a session cookie value, so a Dogear token replayed as the
  session cookie (with a forged Origin and a matching `__Host-csrf`) passed as `session` and could
  export or erase the account, breaking "the Dogear token cannot export or erase".
- Options: keep classifying by transport; tell clients apart by the `user_agent` label; a
  server-owned column on the session row.
- Choice: `sessions.client text NOT NULL DEFAULT 'browser' CHECK (client IN ('browser','dogear'))`
  (edited into `0001_auth_tables.sql`, never applied anywhere), registered as a Better-Auth
  session `additionalFields` entry with `input: false`. The `/device/token` after hook sets
  `client = 'dogear'`. `requireUser` returns `via: "bearer"` for a Dogear row however its token
  arrives; `requireSessionUser` also refuses `client === 'dogear'`. The user-agent label is
  display only.
- Consequence: a session's authority is fixed when it is created and cannot be changed by how a
  request is sent. A Better-Auth upgrade that drops `additionalFields` from `getSession` would
  make every session `browser`; the row tests mock `getSession`, so only a DB-backed run proves it.
- Revisit when: Better-Auth ships per-session scopes, or a third client type is added.

## 2026-11-09 Neon Auth replaces Better-Auth

- Context: the owner decided Neon is the only backend and auth is Neon Auth (managed Better Auth)
  on the new Neon project (PLAN.md section 12). Nothing was ever deployed or migrated, so
  migrations 0001 and 0002 were rewritten in place.
- Options: keep self-hosted Better-Auth (our password hashing, sessions, device flow, signed
  tokens); Neon Auth through `@neon/auth` 0.8.2.
- Choice: Neon Auth. `neonAuth()` (`src/lib/auth/neon-auth.ts`) is built per call. Browser routes
  are session-cookie only (`requireUser`: 401 signed out or with a bearer header, 503
  `auth_unavailable` when Neon Auth errors, never treated as signed out). Sync is bearer only:
  Dogear's EdDSA JWT verified with `jose` against Neon's JWKS (`iss`, `aud` =
  `APP_ORIGIN/api/v1/sync`, `client_id`, uuid `sub`). Our tables keep only `rate_limits` plus the
  user tables, whose `user_id` is a uuid FK to `neon_auth."user"` (ON DELETE CASCADE); the
  migration runner refuses a branch without Neon Auth. `/api/auth/*` is Neon's proxy behind our
  per-IP limiter (every POST, strict bucket for every path but sign-out and consent, fail closed).
  Erase: email check, one delete statement, then `deleteUser()` (502 `erase_incomplete` if it
  fails). Sessions on `/account` come from `listSessions()`; revoke looks the id up there and
  calls `revokeSession({ token })` (the 0.8.2 types revoke by token, not by id).
- Consequence: no password, session or token code of ours. Security properties Neon owns
  (hashing, breached-password check, session lifetime, enumeration copy, auth audit log, grant
  revocation) are recorded as Accepted rows in OPEN_ITEMS.md, each with a revisit trigger. A
  Neon Auth outage means no sign-in and 503 on session routes. A plain local Postgres no longer
  migrates (accepted: nothing runs locally).
- Supersedes (old entries stay as history): "Argon2id from node:crypto, stored as a PHC string";
  "Sessions: 30 days absolute, Better-Auth's __Secure- cookie"; "Signed bearer tokens only; raw
  session tokens accepted in the database"; "Enumeration: uniform login and reset, sign-up says the
  email is taken"; "Password reset: 1 hour token, Resend REST, 503 without mail"; "Breached-password
  check in a hook, failing open, instead of the HIBP plugin"; "Auth runs on a Neon WebSocket Pool";
  "Account erase, device sign-out and export bypass Better-Auth's endpoints"; "Dogear's device
  token is signed by an after hook on /device/token"; "Sessions carry a client column;
  authorization classifies by row". Still in force: the CSRF double-submit, the app limiter, sync
  bearer only (now a JWT), erase confirms with the email.
- Revisit when: Neon Auth documents grant revocation, `__Host-` cookies or its rate limits, or
  `@neon/auth` reaches 1.0.

## 2026-11-09 Dogear authorizes at the Neon Auth URL, not through the /api/auth proxy

- Context: PLAN.md N4 spike, 12.5 top risk. The session cookie lives on the Lorestep origin, so
  the question was whether the authorize leg must run through Lorestep's `/api/auth` proxy
  (option B, the plan's default) for Neon to see the session.
- Options: (A) Dogear opens `NEON_AUTH_BASE_URL/oauth2/authorize` and posts to
  `NEON_AUTH_BASE_URL/oauth2/token` directly; (B) both through `APP_ORIGIN/api/auth/oauth2/*`.
- Choice: A. Read from `@neon/auth` 0.8.2 `dist/server.js` (`handleAuthRequest`): the proxy
  re-fetches upstream with `fetch`'s default `redirect: "follow"`, so a proxied authorize follows
  Neon's 302 on the server; the browser would render the login page under the authorize URL
  without Neon's signed query (or, already consented, the server would fetch the
  `chromiumapp.org` redirect itself and the code would be lost). A needs no Lorestep cookie at
  Neon: Neon's documented flow sends a session-less authorize to our `login_page`, which resumes
  it with `POST /oauth2/continue` (or the sign-in POST carrying `oauth_query`) through the proxy,
  first-party. Token calls go direct too: no proxy hop, no `withAuthLimit` strict bucket on
  refresh, and the Neon origin is already in Dogear's `host_permissions` (N6).
- Also from the Neon docs (2026-11-06), changing N-12: the `id_token` has no `email`; Dogear reads
  it from `/oauth2/userinfo`. Scope is `openid email offline_access` (`profile` dropped, unused).
  Without an MCP resource there is no refresh-reuse window, so a concurrent refresh revokes the
  user's Dogear grants: the single in-flight refresh is mandatory, not an optimisation.
  The consent page signed out redirects to `/oauth/login?<query>`, not `/sign-in?next=`, so the
  request resumes through Neon.
- Consequence: `docs/DOGEAR.md` documents A; Dogear's `AUTH_BASE` must be the Neon Auth URL.
  The proxy still serves the pages' `continue`, `consent` and `public-client` calls (JSON
  answers, never redirects).
- Revisit when: the user spike (PLAN.md 12.4 step 11) fails at a hop, or `@neon/auth` changes
  the proxy to `redirect: "manual"`.

## 2026-11-09 Erase deletes neon_auth."user" directly because Neon's deleteUser is disabled

- Context: CI e2e on the Neon `ci` branch: `neonAuth().deleteUser({})` answers 404
  `user_not_found` right after sign-up. Better Auth hides its delete-user endpoint (404) while
  `user.deleteUser.enabled` is off, and Neon exposes no setting for it. Erase left the identity.
- Options: (A) keep `deleteUser()` and wait for Neon; (B) delete the `neon_auth."user"` row in the
  same statement as the app-data CTEs, letting the managed FKs cascade sessions and accounts;
  (C) B plus explicit deletes from `neon_auth.session`/`account` by guessed column names.
- Choice: B. Data and identity go in one atomic statement, so there is no half-erased state and
  the 502 `erase_incomplete` path is gone. The cascade is not assumed: `scripts/migrate.mjs`
  refuses to run unless `neon_auth.session` and `neon_auth.account` reference `"user"` with
  `ON DELETE CASCADE` (`pg_constraint.confdeltype = 'c'`), and prints every such FK. C was
  rejected while the column names are unverified. `signOut()` then clears the caller's cookies,
  best-effort.
- Consequence: erase writes into Neon's managed schema, which Neon may change; the migrate check
  and e2e/account.spec.ts are the tripwires. Other devices may read as signed in for up to
  `sessionDataTtl` (60 s).
- Revisit when: Neon exposes delete-user or an admin delete API, or the migrate check fails.

## 2026-11-09 Dogear becomes Lorestep for Chrome, inside this repo

- Context: the owner wants one product under one name: story orders, the media log and the
  browser extension.
- Options: keep `dogear` as its own repo and name; rename it and keep two repos; move it into
  `extension/` here as "Lorestep for Chrome".
- Choice: moved and renamed. Code identifiers, messages and env vars say Lorestep/extension.
  Persisted names are KEPT so existing installs lose nothing: every `chrome.storage` key, the
  `dogear-sync` alarm, the `dogear` export format and `Downloads/Dogear/dogear-backup.json`. The
  manifest key is unchanged, so the extension id and its OAuth redirect stay the same.
- Consequence: a few internal strings still say "dogear" on purpose.
- Revisit when: a breaking release can migrate storage and backup names.

## 2026-11-09 Erase also deletes every non-cascading neon_auth user table, found at erase time

- Context: final security review. `scripts/migrate.mjs` asserted cascades only for the FKs it
  knew (session, account, member, invitation); Neon's OAuth provider tables (access tokens,
  consents) carry a user id too, so erase could leave a user's grants and tokens behind.
- Options: (A) extend the migrate assertion with the OAuth table names; (B) at erase time, read
  `information_schema.columns` + `pg_constraint` for every `neon_auth` base table with a `userId`
  or `user_id` column and no `ON DELETE CASCADE` FK to `"user"` on it, and delete those rows in
  the same statement (identifiers via `sql.identifier`, id compared as text).
- Choice: B. It covers tables Neon adds later without a code change, and needs no guessed names.
  `migrate.mjs` now only prints every user-id table with its delete rule and no longer fails on a
  non-cascading one; this supersedes the migrate check in the 2026-11-09 "Erase deletes
  neon_auth."user" directly" entry. A was rejected: a fixed list goes stale silently.
- Consequence: erase is two statements (one read-only catalog query, then the one atomic
  delete). It deletes from Neon-managed tables, including any OAuth client application row the
  erased user owns. The app role needs SELECT on the catalog and DELETE on those tables.
- Revisit when: Neon exposes a delete-user API that removes its own rows.
