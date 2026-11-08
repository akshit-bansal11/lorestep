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
