# PLAN: merge Plotline and Dogear into Lorestep

Plan only. Nothing here has been implemented. No local builds, installs or node runs: CI is the tester (`npm run check:ci`, `.github/workflows/ci.yml`). Every milestone is one or more commits that leave CI green. Repos: `lorestep` = F:/projects/lorestep, `dogear` = F:/projects/dogear, `plotline` = F:/projects/plotline/plotline.

## 1. Context (verified by reading)

- Lorestep: Next ^16.2, Drizzle on Neon HTTP (`src/lib/db/client.ts:17` `db()` = `drizzle(neon(url), {schema})`, built per call so a missing `DATABASE_URL` fails at use, never at import). Content routes `/ /games /screen /books /about /docs /screen/*` MUST stay prerendered (`scripts/check-static.mjs:22-35`, run in CI `build` job). Nothing in the shared layout may read cookies or headers.
- Lorestep schema is created by raw SQL in `scripts/seed-db.mjs:37-89`, which DROPs `games`, `franchises`, `screen_franchises` on every run. Its comment (`:32-36`) says drizzle-kit earns its place once per-user rows exist. Consequence: user tables live outside the seed script and must NOT foreign-key to catalog tables (the DROP would fail or cascade).
- Lorestep marks live only in localStorage `isitcanon/entries/v1` (`src/constants/canon/storage.ts:1`), keyed by game id, shape `{status, device?, storefront?}` (`src/types/canon/user.ts:4-25`), via `src/utils/canon/entries-store.ts` (`setEntryField(gameId, field, value)`, `getEntriesSnapshot()`, `clearAllEntries()`, `subscribeEntries()`), consumed by `src/hooks/canon/use-entries.ts:13-27` and `CanonApp.tsx`.
- Plotline: Firestore `users/{uid}/entries` and `lists/{id}/items`; model in `plotline/src/types/log-entry.ts:8-113,133-173` and `types/lists.ts:7-31`; routes `api/{metadata,search,resolve-link,profile-image}`; limiter `lib/rateLimit.ts` is in-memory (Upstash only on forgot-password); `resolve/streamingResolver.ts:164` fetches scraped HTML via `safeFetchHtml` (SSRF surface, see M9).
- Dogear: entries `{s, title, kind: series|movie|"", url, at}` under `t:<platform>:<id>` (`core/store.js:87-98`); it already has a service worker (`background.js`, `importScripts` at `:11`, message listener `:151-162`). `scripts/check.mjs:51-69` hard-fails on any `host_permissions` key and pins the permission list: both change deliberately in D1. Dogear entries have no year and no external IDs.
- Lorestep already owns a `vercel.json` (redirect from the old vercel.app host); M12 adds `crons` to it.

## 2. Decisions

| # | Decision | Reason |
|---|---|---|
| D-1 | Neon Postgres is the ONLY server store. No Firestore, Upstash, Cloudinary, Blob/KV. Dogear `chrome.storage.local` = on-device cache only. | User decision. |
| D-2 | Better-Auth + Drizzle adapter + `bearer()` + `deviceAuthorization()` + `haveIBeenPwned()` plugins. Only new runtime deps: `better-auth`, `zod`. | `zod`: Plotline's request/metadata schemas are zod 4 and are ported as-is; better-auth already depends on zod, so no new install weight. Everything else is stdlib or `fetch`. |
| D-3 | Migrations = plain SQL files `db/migrations/NNNN_name.sql` + `NNNN_name.down.sql`, applied by `scripts/migrate.mjs` (tracks `schema_migrations`). Drizzle `schema.ts` mirrors them for typed queries. | `drizzle-kit generate` needs a local node run (forbidden) and hand-written snapshots drift. DB-09 reversibility = the `.down.sql`. DB-D06 = `IF NOT EXISTS`. Each migration is its own commit (DB-08). |
| D-4 | Production migrations run by `.github/workflows/migrate.yml` (`workflow_dispatch`, GitHub Environment `production` with required reviewer); CI applies them to a branch DB before e2e. | CLAUDE.md 0.5: nothing local. |
| D-5 | CI e2e uses a Neon branch: GitHub secret `DATABASE_URL_CI`. The e2e job runs `db:migrate` then `data:seed` against it. | e2e signs users up; production `DATABASE_URL` must never see test users (DB-20). |
| D-6 | Passwords: Argon2id via `node:crypto` `argon2` (Node 24.7+, no dep), 64 MiB, t=3, p=1, supplied through Better-Auth `emailAndPassword.password.{hash,verify}`. Min 15 chars, max 128, no composition rules; `haveIBeenPwned` plugin (fail open, logged). | SEC-05/06. Executor verifies `crypto.argon2` exists in `@types/node` ^26 and on the Vercel runtime; if not, STOP and ask (no silent scrypt fallback). |
| D-7 | Sessions: cookie `HttpOnly; Secure; SameSite=Lax`, `__Host-` prefix if Better-Auth config allows, rolling refresh disabled so `expiresIn` (30 d) is the absolute cap; other sessions revoked on password change/reset. | SEC-07/08. |
| D-8 | Dogear auth = OAuth 2.0 Device Authorization Grant (Better-Auth `deviceAuthorization` plugin). Extension opens `https://lorestep.akshitbansal.dev/device?user_code=XXXX-XXXX` in a tab, user signs in and approves on the real origin, extension polls `/api/auth/device/token`, receives a Better-Auth session token, sends `Authorization: Bearer`. Fallback only if the plugin is unusable: own `device_codes` table (hashed code, 10 min, single use) with the same three endpoints. | No `identity`, `tabs`, `externally_connectable` or redirect interception needed. |
| D-9 | Dogear token stored in `chrome.storage.local` key `auth`, read only by `background.js`. Not `storage.session`. | `storage.session` is cleared on browser restart (forces re-pairing daily). Mitigations: 30 d absolute expiry, per-device revocation in `/account`, no content script reads the key, never logged. |
| D-10 | Dogear sync runs only in the service worker (`fetch` under `host_permissions: ["https://lorestep.akshitbansal.dev/*"]`, which bypasses CORS). Lorestep sends NO `Access-Control-*` headers anywhere. | SEC-18: the explicit allowlist is empty. |
| D-11 | Rate limiting: Postgres fixed-window counter `rate_limits(bucket, window_start)` with atomic `INSERT ... ON CONFLICT DO UPDATE SET count = rate_limits.count + 1 RETURNING count`. Better-Auth's own limiter uses `storage: "database"` into `auth_rate_limits`. Client IP only from the Vercel-set forwarded header; unresolved IP on unauthenticated routes = deny. | User decision + SEC-20. Two tables because Better-Auth's limiter is non-atomic and has a fixed shape. |
| D-12 | Profile image = OAuth provider avatar URL (`users.image`, https only) else initials generated in the client. `profile-image` route and Cloudinary dropped. reCAPTCHA dropped (Postgres limiter + HIBP replace it). | User decision; one fewer third party. |
| D-13 | `metadata`, `search`, `resolve-link` become session-required (they spend provider quota). Limits 60/60/30 per minute per user. | Plotline had them public and IP-keyed in memory. |
| D-14 | Streaming title to entry match (Dogear to server): (1) `(user, platform, platformId)` link exists, else (2) `title_norm` equal AND kind compatible AND exactly one live candidate, else (3) create a new entry. More than one candidate = create, never guess. `title_norm` is a TS port of Dogear `normTitle` with shared fixture cases in both repos. Year and external ids are used when a client sends them, not required. Kind compatibility: movie~movie; series~series|anime; unknown kind matches movie|series|anime and creates as `series` (`anime` for Crunchyroll). | Dogear has neither year nor ids. A false merge is worse than a duplicate the user can merge later. |
| D-15 | Dogear mark `null` (clear) sets `status = NULL`; the service soft-deletes the entry only if it also has no rating, notes, shelf or list membership. | Do not destroy Plotline-side data from a streaming-site click. |
| D-16 | Soft delete for every user-facing delete (`deleted_at`), purged after 30 days by a cron route. Tombstones double as the sync delete signal. | DB-13. |
| D-17 | CSRF on cookie-authenticated mutating routes = exact `Origin` match + non-simple `Content-Type: application/json` + SameSite=Lax. No CSRF token. Bearer requests carry no ambient credential, so they are exempt. RECORD AS DEVIATION from SEC-19 in DECISIONS.md (Q3). | Honest conflict; flagged, not hidden. |
| D-18 | Enumeration (SEC-10/11): login responses uniform; signup surfaces "email already registered" because email verification is optional (Resend may be absent). Written to DECISIONS.md. | SEC-11 requires the choice recorded. |
| D-19 | Caps: entries per user 5000 (Plotline 1000; Lorestep alone has 690 games), lists 50, title 160, notes 4000, list name 80, list description 500, `image_url` 500. Mirrored as CHECK constraints (DB-24). | `plotline/src/constants/limits.ts:7-22`. |
| D-20 | Lorestep's UI keeps its 7-option game status dropdown; a mapper converts to and from the canonical model losslessly (section 3). | No visual change to the existing tracker (CLAUDE.md section 10). |
| D-21 | Plotline `rewatching/rereading/replaying` become `in_progress` plus `repeat_count`; `fully_completed` becomes `completed` (distinction dropped; no data is migrated, so nothing is lost). | No Firestore migration. |

## 3. Status model

Canonical `status` (closed set, nullable): `planned | in_progress | completed | on_hold | dropped`. Game-only orthogonal column `shelf` (nullable): `own | wishlist | trash`. UI label is per kind: in_progress = Watching / Reading / Playing; planned = Plan to watch / read / play.

| Canonical (status, shelf) | Plotline | Dogear | Lorestep (UI id) |
|---|---|---|---|
| in_progress, null | watching, reading, playing, rewatching*, rereading*, replaying* | watching | playing |
| planned, null | plan_to_watch, plan_to_read, plan_to_play | plan | (new; shown as "Planned") |
| completed, null | completed, fully_completed | completed | completed |
| on_hold, null | on_hold | hold | (new; shown as "On hold") |
| dropped, null | dropped | dropped | dropped |
| planned, own | backlogged | n/a | backlogged |
| planned, wishlist | legacy wishlist | n/a | wishlist |
| NULL, own | legacy own | n/a | own |
| dropped, trash | n/a | n/a | trash |

`*` = `in_progress` with `repeat_count` incremented by the UI.

Mapper contract (M6): `toCanonical(s: Status): {status, shelf}` is the table above read right to left. `toLorestepStatus(status, shelf): Status | "planned" | "on_hold"` reads in this order: `shelf=trash -> trash`; `shelf=wishlist -> wishlist`; `shelf=own` with `status=planned -> backlogged`, with `status NULL -> own`, otherwise by status; no shelf -> by status. The two extra ids (`planned`, `on_hold`) only arise for rows created in the new library or by Dogear; the games table shows them read-only with those labels and never rewrites them unless the user picks a value. Round trip of all 7 Lorestep ids is asserted by test.

Dogear keeps its internal ids (storage unchanged) and maps at the sync boundary only: `watching->in_progress, plan->planned, hold->on_hold, completed->completed, dropped->dropped`. `trash` semantics are UNKNOWN to me (Q1).

## 4. Schema (Drizzle sketches; SQL in `db/migrations`)

Conventions: snake_case columns, `timestamptz`, uuid `gen_random_uuid()` for domain ids, a `@classification personal|credential|neither` JSDoc on EVERY column (DB-14), CHECK length caps (DB-24), explicit `notNull()`/default (DB-01). No FK to catalog tables.

```ts
// Better-Auth core, renamed to avoid the reserved word `user`: betterAuth({ user:{modelName:"users"}, ... })
users        { id text pk, name text nn, email text nn UNIQUE, emailVerified bool nn default false,
               image text null (https only), createdAt, updatedAt }                    // personal
sessions     { id text pk, token text nn UNIQUE, expiresAt, ipAddress text null, userAgent text null,
               userId -> users.id cascade nn, createdAt, updatedAt }                   // token = credential (R1)
accounts     { id text pk, accountId, providerId, userId -> users cascade, accessToken?, refreshToken?, idToken?,
               accessTokenExpiresAt?, refreshTokenExpiresAt?, scope?, password? (argon2id hash), createdAt, updatedAt }
verifications{ id text pk, identifier, value, expiresAt, createdAt, updatedAt }
deviceCodes  { per Better-Auth deviceAuthorization schema; executor copies it from the docs; table `device_codes` }
authRateLimits { id text pk, key text UNIQUE, count int, lastRequest bigint }
rateLimits   { bucket text, windowStart bigint, count int nn default 0, PK(bucket, windowStart) } // index windowStart (purge)

entries {
  id uuid pk, userId text nn -> users cascade,
  kind text nn CHECK in (movie,series,anime,manga,game),
  title text nn CHECK <=160, titleNorm text nn,
  year smallint null,
  status text null CHECK in (planned,in_progress,completed,on_hold,dropped),
  statusAt timestamptz null,                      // last-write-wins clock for sync
  shelf text null CHECK in (own,wishlist,trash) AND (shelf IS NULL OR kind='game'),
  rating smallint null CHECK 1..10,
  notes text nn default '' CHECK <=4000,
  progress jsonb nn default '{}',                 // {episodes,seasons,chapters,volumes,playMinutes}; zod-validated, read whole
  repeatCount int nn default 0 CHECK >=0,
  device text null, storefront text null,         // Lorestep game fields, validated against the existing option lists
  gameId text null,                               // Lorestep catalog games.id, NO FK
  extSource text null CHECK in (tmdb,omdb,mal,igdb), extId text null,
  imageUrl text null CHECK https and <=500,
  startedAt timestamptz null, completedAt timestamptz null,
  createdAt, updatedAt nn default now(), deletedAt null
}
  UNIQUE (id, userId)
  UNIQUE (userId, gameId)            WHERE gameId IS NOT NULL AND deletedAt IS NULL
  UNIQUE (userId, extSource, extId)  WHERE extId  IS NOT NULL AND deletedAt IS NULL
  INDEX  (userId, kind, status)      WHERE deletedAt IS NULL          -- library list
  INDEX  (userId, titleNorm, kind)   WHERE deletedAt IS NULL          -- Dogear matching
  INDEX  (userId, updatedAt, id)                                       -- sync cursor
  INDEX  (deletedAt) WHERE deletedAt IS NOT NULL                       -- purge sweep

entryLinks {                                     // Dogear tile -> entry
  userId text nn, platform text nn CHECK in (netflix,primevideo,hotstar,zee5,hbomax,crunchyroll),
  platformId text nn CHECK <=128 AND ~ '^[A-Za-z0-9_-]+$', entryId uuid nn,
  url text null (https, <=500), updatedAt,
  PK (userId, platform, platformId), INDEX (entryId),
  FK (entryId, userId) -> entries(id, userId) cascade }   // a link can never cross owners

lists { id uuid pk, userId text nn -> users cascade, name text nn CHECK <=80, description text nn default '' CHECK <=500,
        kinds text[] nn default '{}', createdAt, updatedAt, deletedAt null,
        UNIQUE(id,userId), UNIQUE(userId,name) WHERE deletedAt IS NULL, INDEX(userId, updatedAt) WHERE deletedAt IS NULL }
listItems { id uuid pk, listId uuid nn, userId text nn, FK (listId,userId) -> lists(id,userId) cascade,
            kind text nn, title text nn, year smallint null, extSource text null, extId text null, imageUrl text null,
            sortOrder int nn, addedAt, UNIQUE(listId, extSource, extId) WHERE extId IS NOT NULL, INDEX(listId, sortOrder) }
```

Multi-statement atomicity: neon-http has no interactive transactions; use single-statement CTEs or drizzle `db.batch([...])`. The list cap (50) and entry cap (5000) are enforced by `INSERT ... SELECT ... WHERE (SELECT count(*) ...) < cap` in one statement.

Deletion path module (DB-D10): `src/services/account/user-tables.ts` exports the ordered list of user-owned tables used by account delete, export and the orphan check.

## 5. API surface

All JSON, `{ data }` or `{ error: { code, message } }`. Auth column: S = session cookie, B = bearer, S|B = either. Unknown or foreign ids return 404 (never 403). Body cap 64 KB (sync push 256 KB). Every handler: parse -> zod -> `requireUser` -> service -> respond. No CORS headers on any route. Cookie-auth mutating routes also run `assertSameOrigin` (D-17).

| Method + path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `* /api/auth/*` | Better-Auth | sign-up/in/out, session, reset, social callbacks, device code/token/approve | per Better-Auth | 400, 401, 403, 429 |
| GET `/api/v1/auth-providers` | none, limiter by IP | | 200 `{github,google,reset}` booleans | 429 |
| GET `/api/v1/entries` | S\|B | `?kind&status&q&cursor&limit<=100` | 200 `{items:Entry[], nextCursor}` | 400, 401 |
| POST `/api/v1/entries` | S | EntryCreate | 201 `Entry` | 400, 401, 409 `duplicate`, 409 `limit`, 429 |
| GET/PATCH/DELETE `/api/v1/entries/:id` | S | PATCH = partial EntryCreate | 200 `Entry` / 204 | 400, 401, 404, 409 |
| PUT `/api/v1/entries/game/:gameId` | S\|B | `{status: LorestepStatus\|null, device?, storefront?}` (gameId must exist in `games`) | 200 `Entry` / 204 on clear | 400, 401, 404 |
| POST `/api/v1/import/local` | S | `{entries: Record<gameId,{status,device?,storefront?}>}` max 1000 keys | 200 `{inserted, skipped}` (insert-if-absent, server wins) | 400, 401, 413, 429 |
| GET/POST `/api/v1/lists` | S | POST `{name,description?,kinds?}` | 200 / 201 `List` | 400, 401, 409 `duplicate`/`limit` |
| GET/PATCH/DELETE `/api/v1/lists/:id` | S | | 200 `List+items` / 204 | 401, 404 |
| POST `/api/v1/lists/:id/items` | S | `{kind,title,year?,extSource?,extId?,imageUrl?}` | 201 `ListItem` | 400, 401, 404, 409 |
| DELETE `/api/v1/lists/:id/items/:itemId` | S | | 204 | 401, 404 |
| PUT `/api/v1/lists/:id/items/order` | S | `{ids: uuid[]}` (must equal the list's item set) | 204 | 400, 401, 404 |
| GET `/api/v1/metadata` | S | `?type&id&title&year` (ported zod schema) | 200 `{data,cached,missingFields?}` | 400, 401, 404, 429, 502 |
| GET `/api/v1/search` | S | `?q&type` | 200 results (<=30) | 400, 401, 429 |
| POST `/api/v1/resolve-link` | S | `{url}` | 200 resolved item | 400, 401, 422 unsupported host, 429 |
| GET `/api/v1/sync` | B (S ok) | `?since=<cursor>&limit<=500&kinds=movie,series,anime` | 200 `{changes:[{entry, links, deleted}], cursor}` | 400, 401, 429 |
| POST `/api/v1/sync/push` | B | `{marks:[{platform,platformId,title,kind?,year?,url?,status:CanonicalStatus\|null,at:epochMs}]}` max 200 | 200 `{applied, skipped, results:[{platform,platformId,entryId,status,statusAt}]}` | 400, 401, 413, 429 |
| GET `/api/v1/account/export` | S | | 200 JSON download (entries, lists, items, links; no credentials) | 401 |
| DELETE `/api/v1/account` | S | `{confirm:"DELETE"}` | 204, hard erase of every user table | 400, 401 |
| GET/DELETE `/api/v1/account/sessions[/:id]` | S | list / revoke devices | 200 / 204 | 401, 404 |
| GET `/api/cron/purge` | `Authorization: Bearer CRON_SECRET` (sha256 + `timingSafeEqual`) | | 200 `{purged}` | 401 |

Push semantics: a mark applies only if `at > entry.statusAt` (client `at` clamped to now + 5 min); apply sets `statusAt` and `updatedAt`. Pull cursor is opaque `base64(updatedAt|id)`; tombstones (`deleted:true`) are included until purged. Entry JSON: `{id, kind, title, year, status, shelf, rating, notes, progress, repeatCount, device, storefront, gameId, ext:{source,id}|null, imageUrl, startedAt, completedAt, createdAt, updatedAt}`.

## 6. Env vars (names only)

Lorestep: `DATABASE_URL` (existing), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (each provider enabled only if both vars present), `RESEND_API_KEY`, `MAIL_FROM` (reset email disabled in the UI if absent), `CRON_SECRET`, `TMDB_API_KEY`, `TMDB_BEARER_TOKEN`, `OMDB_API_KEY`, `MAL_CLIENT_ID`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` (existing names; Plotline's `TWITCH_CLIENT_ID/SECRET` are renamed to these). GitHub Actions secrets: `DATABASE_URL` (existing), `DATABASE_URL_CI`. Dropped vs Plotline: all `FIREBASE_*`, `UPSTASH_*`, `CLOUDINARY_URL`, `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. Dogear: none (the origin is a code constant).

## 7. Milestones

Executor rungs: fast = `executor-fast`, std = `executor`, deep = `executor-deep`. T = needs tester. R = needs the final `reviewer-deep` pass. Global per-milestone rules: read the relevant guide under `node_modules/next/dist/docs/` first (AGENTS.md); local install is forbidden, so for library APIs read the library's online docs and keep to what CI typecheck can prove; update STATE.md / DECISIONS.md / OPEN_ITEMS.md in the same commit if they exist (create per `.claude/CLAUDE.md` section 19 only when a trigger fired).

### M1 [lorestep] Migration runner and CI plumbing (deep, T)
- Files: `scripts/migrate.mjs`, `db/migrations/0000_schema_migrations.sql` (+`.down.sql`), `package.json` (script `db:migrate`), `.github/workflows/migrate.yml`, `.github/workflows/ci.yml` (e2e job: add `db:migrate` and `data:seed` against `DATABASE_URL_CI`, `BETTER_AUTH_SECRET` random per run, `BETTER_AUTH_URL=http://localhost:3001`), `.env.example`, `src/lib/db/migrate-order.test.ts`.
- Read: `scripts/seed-db.mjs:15-39` (neon tagged-template usage); `package.json:7-29`; `.github/workflows/ci.yml:57-97`; `playwright.config.ts` (whole: port 3001, webServer env).
- Change: `migrate.mjs` takes DATABASE_URL, creates `schema_migrations(name text pk, applied_at)`, applies unapplied `*.sql` (not `.down.sql`) in filename order, records each name; refuses to run when `process.env.CI` is unset and the URL host is not `localhost` unless `--allow-remote`. `--down <name>` runs the `.down.sql`. Pure ordering and validation helpers are exported and unit-tested (filename pattern `^\d{4}_[a-z0-9_]+\.sql$`, a down file exists for every up file). `migrate.yml`: dispatch only, `environment: production`. `data:seed` is NOT changed and never touches user tables.
- Accept: `check:ci` green; e2e job still passes (migration 0000 only); second `db:migrate` run applies 0.
- Depends: none. Manual prerequisites: Neon branch + `DATABASE_URL_CI` secret, GitHub Environment `production` with a reviewer.

### M2 [lorestep] Migration 0001: auth + limiter tables (deep) - own commit
- Files: `db/migrations/0001_auth_tables.sql` (+down), `src/lib/db/schema.ts` (append users, sessions, accounts, verifications, deviceCodes, authRateLimits, rateLimits).
- Read: `src/lib/db/schema.ts:1-109` (imports, `pgTable` + index style, JSDoc style); Better-Auth docs: core schema, `deviceAuthorization` schema, rate-limit `database` storage schema, `modelName` mapping.
- Change: SQL with `IF NOT EXISTS`, classification comment on each column, indexes `sessions(user_id)`, `accounts(user_id)`, `verifications(identifier)`, `rate_limits(window_start)`. The Drizzle mirror uses identical column names. No data change.
- Accept: the CI e2e migrate step applies it on the CI branch; typecheck green; the down file drops in reverse FK order.
- Depends: M1.

### M3 [lorestep] Better-Auth server, guards, limiter (deep, T, R)
- Files: `package.json` / `package-lock.json` (add `better-auth`, `zod`; commit prefix `add-p/`), `src/lib/auth/auth.ts`, `src/lib/auth/auth-client.ts`, `src/lib/auth/password.ts`, `src/lib/auth/require-user.ts`, `src/lib/http/assert-same-origin.ts`, `src/lib/http/client-ip.ts`, `src/lib/http/respond.ts`, `src/lib/db/rate-limit.ts`, `src/app/api/auth/[...all]/route.ts`, `src/lib/db/auth-db.ts` (only if neon-http cannot serve the adapter), `.env.example`, `docs/ROUTE-REGISTER.md` (SEC-03 register: one row per route with path, method, gate, limiter), `DECISIONS.md` entries (D-6, D-7, D-17, D-18).
- Read: `src/lib/db/client.ts:17-27`; `src/app/api/prices/route.ts:1-60` (route style, `NextResponse.json`); `.github/workflows/ci.yml:32-55` (the build job has no auth env).
- Change: `auth.ts` exports `getAuth()` (lazy, like `db()`), never constructed at import, so `next build` and `check:static` need no auth env. Config: `drizzleAdapter(db, {provider:"pg"})` with `modelName` mapping; plugins `bearer()`, `deviceAuthorization()`, `haveIBeenPwned()`, `nextCookies()`; `socialProviders` built only from env present; `emailAndPassword` min 15 / max 128 with `password.hash/verify` from `password.ts` (`node:crypto` `argon2`, 64 MiB, t=3, p=1, random salt per user, constant-time compare); sessions 30 d absolute; revoke other sessions on password change; `advanced.ipAddress.ipAddressHeaders` = the Vercel-set header only; `rateLimit.storage = "database"` with stricter rules for `/sign-in/email`, `/sign-up/email`, `/forget-password`. `require-user.ts`: `requireUser(req): {userId, via: "session"|"bearer"}` or throws a typed 401. `rate-limit.ts`: `rateLimit(bucket, limit, windowSec): Promise<boolean>` using the atomic upsert. `client-ip.ts` returns `string | null`; unauthenticated callers deny on `null`. Reset email via `fetch` to the Resend REST API (no SDK); reset token TTL 1 h recorded in DECISIONS.md; without `RESEND_API_KEY`, reset endpoints answer 503 `reset_unavailable`. Add `GET /api/v1/auth-providers`.
- Risks to resolve here: neon-http has no transactions (use a `neon-serverless` Pool for auth only if the adapter needs them); Better-Auth stores the session token raw in `sessions.token`, which conflicts with DB-15 (record as accepted deviation R1 unless a documented hashing option exists).
- Tests (Vitest): password hash/verify round trip, wrong password, parameters used; `assertSameOrigin` matrix; `clientIp` null on missing or forged header; limiter SQL builder (bucket and window math, pure part).
- Accept: `check:ci` green; the CI `build` job still prerenders every route in `check-static.mjs` (proof static pages do not import the auth module).
- Depends: M2.

### M4 [lorestep] Auth UI and header (std, T)
- Files: `src/app/(site)/sign-in/page.tsx`, `sign-up/page.tsx`, `reset-password/page.tsx`, `src/components/auth/{SignInForm,SignUpForm,ResetForm,OAuthButtons,AccountMenu,Avatar}.tsx`, `src/hooks/auth/use-session.ts`, `src/components/site/SiteHeader.tsx`, `src/constants/auth/copy.ts`, `e2e/auth.spec.ts`.
- Read: `src/components/site/SiteHeader.tsx:9-26`; `src/components/canon/AppHeader.tsx:57-75`; `src/constants/site.ts` (PAGE_LINKS, SITE_NAME); `src/constants/canon/ui.ts` (CONTROL_CLASS, PAGE_CLASS); `e2e/helpers.ts`, `e2e/a11y.spec.ts` (axe pattern). Load UI-SPEC and UX-SPEC before writing markup.
- Change: forms are client components on the Better-Auth client; `AccountMenu` uses the client `useSession()` so the header stays static (no cookies read server-side). Avatar = `users.image` via `<img>` with alt, else initials. OAuth buttons render only for providers `/api/v1/auth-providers` reports. Mockup: header right `[Sign in]`; signed in `[ (JD) v ]` menu: Library, Lists, Account, Sign out. Form: control nested in `<label>`, inline error text linked by `aria-describedby`, submit disabled while pending. Both themes, mobile first. Existing games and tracking behaviour untouched.
- Accept: gate green; axe clean on `/sign-in`, `/sign-up`; e2e: sign up, see menu, sign out, sign in, wrong password and unknown email show the same message; `/`, `/games`, `/screen` still prerendered.
- Depends: M3.

### M5 [lorestep] Migration 0002: domain tables (deep) - own commit
- Files: `db/migrations/0002_log_tables.sql` (+down), `src/lib/db/schema.ts` (entries, entryLinks, lists, listItems).
- Read: section 4 of this plan; `src/lib/db/schema.ts:42-88` (index callback style).
- Change: exactly section 4: CHECK constraints, partial unique indexes, composite FKs, `UNIQUE(id, user_id)`. Put the expected `EXPLAIN` shape of the four hot queries in SQL comments (DB-22); real plans from the CI branch go in the PR if obtainable, else listed UNVERIFIED in OPEN_ITEMS.md.
- Accept: migrate applies and the down file reverts cleanly on the CI branch; typecheck green.
- Depends: M2.

### M6 [lorestep] Entries domain and CRUD API (deep, T, R)
- Files: `src/types/log/entry.ts`, `src/constants/log/{statuses,kinds,limits}.ts`, `src/schemas/log/entry.ts` (zod), `src/mappers/log/{status-mapper,entry-mapper}.ts`, `src/services/log/entries-service.ts`, `src/utils/log/norm-title.ts`, `src/app/api/v1/entries/route.ts`, `.../entries/[id]/route.ts`, `.../entries/game/[gameId]/route.ts`, `docs/ROUTE-REGISTER.md`, tests beside each.
- Read: `src/types/canon/user.ts:4-25`; `src/constants/canon/statuses.ts:3-21`; `src/utils/canon/entry-options.ts` (`isValidOption`, option lists); `plotline/src/types/log-entry.ts:8-113`; `plotline/src/constants/limits.ts:7-22`; `dogear/core/store.js:47-73` (the `normalize` pipeline to port, Indic-safe).
- Change: statuses and mapping exactly per section 3. Service functions take `userId` and ALWAYS put `user_id = $1` in the same WHERE as the id (SEC-01/02); list queries are keyset-paginated, `limit` clamped 1..100, explicit column lists (DB-21). Create returns 409 on unique violation (SQLSTATE 23505), never read-then-write (DB-23). `PUT /game/:gameId` validates `gameId` against `games` (one indexed read) then upserts on `(user_id, game_id)`. `norm-title.ts` is a faithful port of `normalize()`; fixture cases are copied from `dogear/tests/core.test.js` (executor greps that file for the normTitle cases, Indic included).
- Tests: mapper round-trips all 7 Lorestep ids (table-driven); authz: user B gets 404 on user A's entry for GET/PATCH/DELETE; caps; duplicate; norm-title fixtures.
- Accept: gate green; route register rows added.
- Depends: M3, M5.

### M7 [lorestep] Local-marks import and signed-in tracker sync (deep, T, R)
- Files: `src/app/api/v1/import/local/route.ts`, `src/services/log/import-local.ts`, `src/utils/canon/entries-sync.ts`, `src/hooks/canon/use-entries.ts`, `src/components/auth/ImportBanner.tsx`, `src/constants/canon/storage.ts` (add `IMPORT_STORAGE_KEY = "isitcanon/import/v1"`), `src/components/canon/CanonApp.tsx` (mount the banner only), tests.
- Read: `src/utils/canon/entries-store.ts:1-95` (whole); `src/hooks/canon/use-entries.ts:13-27`; `src/components/canon/CanonApp.tsx` (grep `useEntries`, then the surrounding component); `e2e/tracking.spec.ts` (must keep passing signed out).
- Change: signed-out behaviour unchanged. On sign-in with non-empty local entries and no `{userId, decision}` record under `IMPORT_STORAGE_KEY`, `ImportBanner` asks "Import N marks from this browser into your account?" [Import] [Not now] [Never]. Import posts the local map; the server inserts only absent `(user_id, game_id)` rows via `INSERT ... ON CONFLICT DO NOTHING` (idempotent, never overwrites; `{inserted, skipped}`), then the decision is recorded. After an import-or-never decision, signed-in mode: the local store stays as the optimistic cache; each `setEntryField` also fires a debounced `PUT /entries/game/:id`; on session start pull `GET /entries?kind=game` and replace the cache (server wins) only when no decision is pending. Sign-out clears the account-derived cache so a shared machine cannot leak marks. Failures (offline, 401) keep the local write and show a non-blocking "Not synced" state.
- Tests: import is idempotent (second run `inserted: 0`); never overwrites an existing server row; more than 1000 keys -> 413; sign-out clears cache; decision persisted per userId.
- Accept: gate green; `tracking.spec.ts` unchanged and green; new e2e: sign in, import, reload, marks present.
- Depends: M4, M6.

### M8 [lorestep] Lists service and API (std, T)
- Files: `src/schemas/log/list.ts`, `src/services/log/lists-service.ts`, `src/app/api/v1/lists/**/route.ts` (5 files), register rows, tests.
- Read: `plotline/src/types/lists.ts:7-31`; `plotline/src/constants/limits.ts:8,18`; sections 4 and 5 here.
- Change: every query filters `user_id` in the same statement as the list id; item operations go through `list_items.user_id` and the composite FK. Reorder verifies the id set equals the list's item set, then one `UPDATE ... FROM unnest` statement. Caps via a single-statement conditional insert. Delete = soft delete of the list (items cascade at purge).
- Tests: authz matrix for each route with a second user; cap 50; duplicate name 409; reorder with a foreign id 400.
- Accept: gate green.
- Depends: M6.

### M9 [lorestep] Port metadata, search, resolve-link (std, T, R)
- Files: `src/lib/metadata/{tmdb,omdb,mal,igdb,merge,index}.ts`, `src/lib/search/{tmdb,omdb,mal,igdb,merge,index}.ts`, `src/lib/resolve/{imdb,mal,tmdb,streaming}.ts`, `src/lib/http/safe-fetch.ts`, `src/lib/http/guard-url.ts`, `src/schemas/log/{metadata,search,resolve}.ts`, `src/app/api/v1/{metadata,search,resolve-link}/route.ts`, `next.config.ts` (`images.remotePatterns`), `.env.example`, tests.
- Read: `plotline/src/app/api/metadata/route.ts:35-90`; `plotline/src/lib/metadata.ts:31` (`getEnrichedMetadata({type,id,title,year})`); `plotline/src/lib/search.ts:24` (`performMultiProviderSearch`); `plotline/src/lib/safeFetch.ts:14-40` (`safeFetchJson<T>(url, init, retries)`); `plotline/src/lib/resolve/streamingResolver.ts:60-170`; `plotline/src/lib/igdbAuth.ts:20-40`; `plotline/next.config.ts:5-20`; `plotline/src/constants/limits.ts:27-47`; `src/app/api/prices/route.ts` (existing third-party route style).
- Change: copy the provider modules, renaming to Lorestep conventions (kebab-case files, folders under `lib/`), replacing `createInMemoryRateLimit` with `rateLimit()` keyed `meta:<userId>`; the in-memory 5 min caches stay as per-instance best effort (comment states the ceiling). `TWITCH_*` becomes `IGDB_*`. `guard-url.ts`: https only, hostname on an allowlist derived from the streaming/IMDb/MAL/TMDb hosts Plotline supports, reject IP literals and `localhost`, `redirect: "manual"` with re-validation of every hop, response size cap. `images.remotePatterns` keeps TMDB, OMDb, IMDb, MAL, IGDB and the Google avatar host; drops firebasestorage, cloudinary, flagsapi. Do NOT port `profile-image`, `forgot-password`, `verify-captcha`, `session`.
- Tests: schemas reject bad params; `guard-url` rejects `http://`, `https://127.0.0.1`, `https://[::1]`, userinfo, non-allowlisted host, redirect to a private host; limiter returns 429 after the cap (mock `rateLimit`).
- Accept: gate green; no import of `firebase`, `@upstash/*` or `cloudinary` anywhere.
- Depends: M3. Independent of M6-M8 (can run in parallel).

### M10 [lorestep] Library UI (std, T)
- Files: `src/app/(app)/library/page.tsx`, `src/components/log/{LibraryTable,EntryRow,EntryEditor,KindTabs,StatusSelect,RatingInput,ProgressFields,SearchAddDialog}.tsx`, `src/hooks/log/{use-library,use-metadata-search}.ts`, `src/lib/api/log-client.ts` (typed client; no raw `fetch` in components), `src/constants/log/copy.ts`, `e2e/library.spec.ts`.
- Read: `src/components/canon/CanonTable.tsx` and `OptionSelect.tsx` (reuse, do not duplicate); `src/components/canon/GameCell.tsx`; `src/constants/canon/ui.ts`; `plotline/src/hooks/use-log-entry.ts` and `plotline/src/data/log-entry.ts` (field order and copy only, no visual port); `plotline/src/components/ui/StarRating.tsx` (rating semantics).
- Change: server component page checks the session (`auth.api.getSession`) and redirects to `/sign-in?next=/library`; this route is intentionally dynamic. Mockup:
```
Library            [Movies|Series|Anime|Manga|Games]          [+ Add]
[search v] [status v]
Title            Year  Status        Rating  Progress
Dune             2021  Completed     9       -
Frieren          2023  Watching      -       S1 E14
[row click -> EntryEditor drawer: status, rating 1-10, progress, notes, platform; Delete (undo toast, restorable 30 d)]
```
SearchAddDialog: type-to-search via `/api/v1/search`, pick a result, `/api/v1/metadata` prefills, POST entry. Design empty, loading, error and offline states first (UX-SPEC).
- Accept: gate green; axe clean; e2e add, edit, delete, undo.
- Depends: M4, M6, M9.

### M11 [lorestep] Lists UI (std, T)
- Files: `src/app/(app)/lists/page.tsx`, `lists/[id]/page.tsx`, `src/components/log/{ListGrid,ListHeader,ListItemRow,NewListDialog}.tsx`, `src/hooks/log/use-lists.ts`, `e2e/lists.spec.ts`.
- Read: `plotline/src/components/lists/NewListModal.tsx`, `MyListsModal.tsx` (behaviour only); `src/lib/api/log-client.ts` (from M10).
- Change: create, rename and delete list; add from library or search; reorder by keyboard-accessible Up/Down buttons that call the order endpoint (drag-and-drop NOT ported, so no `motion` dependency). Mockup: Lists = `[+ New]` plus a grid of cards (name, count, kinds); detail = ordered rows with move up/down and remove.
- Accept: gate green; axe clean; e2e create list, add item, reorder, delete.
- Depends: M8, M10.

### M12 [lorestep] Account page, export, erasure, purge cron (deep, T, R)
- Files: `src/app/(app)/account/page.tsx`, `src/components/account/{ProfileCard,DevicesList,ExportButton,DeleteAccount}.tsx`, `src/app/api/v1/account/route.ts`, `.../account/export/route.ts`, `.../account/sessions/**`, `src/app/api/cron/purge/route.ts`, `src/services/account/{user-tables,export,erase,purge}.ts`, `vercel.json` (add `crons`: daily `/api/cron/purge`), `OPEN_ITEMS.md`, tests.
- Read: `vercel.json:1-11`; `src/lib/auth/require-user.ts` (M3); section 4 deletion list.
- Change: export = JSON of all user rows (no credentials). Erase = delete the user row (cascades) plus the explicit table list in `user-tables.ts` (DB-11). Purge = hard delete rows with `deleted_at < now() - 30 days`, `rate_limits` older than 1 day, expired `sessions` and `verifications`; compares `CRON_SECRET` by sha256 + `timingSafeEqual`; no `job_runs` table (YAGNI: result is returned and logged). DevicesList lists Better-Auth sessions (user agent, last used) with Revoke; the Dogear device appears here. Inactivity retention (DPDP one year) is NOT built: recorded in OPEN_ITEMS.md with the statutory date.
- Tests: erase leaves zero rows for that user in every table in `user-tables.ts` (SEC-22 end to end) and other users untouched; export contains no `token` or `password`; purge touches only expired rows; cron 401 without the secret.
- Accept: gate green; e2e: deleting the account removes the ability to sign in.
- Depends: M6, M8.

### M13 [lorestep] Dogear server: device approval and sync API (deep, T, R)
- Files: `src/app/(app)/device/page.tsx`, `src/components/auth/DeviceApproval.tsx`, `src/app/api/v1/sync/route.ts`, `src/app/api/v1/sync/push/route.ts`, `src/schemas/sync/{pull,push}.ts`, `src/services/sync/{pull,push,match-entry}.ts`, register rows, tests, `docs/DOGEAR.md` (protocol, one page).
- Read: `src/lib/auth/require-user.ts` and `auth.ts` (M3, deviceAuthorization config); `dogear/core/store.js:87-98` (mark shape); `dogear/core/states.js:104-121` (platform ids); `src/utils/log/norm-title.ts` (M6).
- Change: `/device` requires sign-in, shows the code and the client name "Dogear", [Approve] [Deny]; approval creates a session labelled "Dogear (Chrome)". Push: per mark in order, resolve the entry per D-14 (link lookup, then candidate match, then create), apply LWW against `statusAt`, upsert `entry_links`; one `db.batch` per request, 200 marks max. Pull: keyset by `(updated_at, id)`, includes tombstones and each entry's links, filtered by `kinds`. Rate limit 60/min per user for both. Unknown platform ids rejected (400).
- Tests: LWW both directions; older mark skipped; same title on two platforms links to one entry; two candidates creates a new entry; Dogear clear on an entry with a rating keeps the entry (D-15); a foreign entry id is never reachable; pull cursor stable across `updated_at` ties.
- Accept: gate green; e2e: approve a device code in the browser, exchange the token over `request`, push and pull a mark.
- Depends: M3, M6, M12.

### D1 [dogear] Manifest host, check.mjs, wire mapping (std, T)
- Files: `manifest.json` (add `"host_permissions": ["https://lorestep.akshitbansal.dev/*"]`; version 0.6.0), `package.json` (0.6.0), `scripts/check.mjs`, `core/states.js` (add `D.WIRE` maps both ways), `tests/core.test.js`.
- Read: `manifest.json:14-25`; `scripts/check.mjs:41-69,71-85`; `core/states.js:9-22,104-121`; `tests/core.test.js` (test style).
- Change: `check.mjs` permits exactly `host_permissions == ["https://lorestep.akshitbansal.dev/*"]` and keeps failing on `optional_host_permissions`, `web_accessible_resources`, `externally_connectable`; the bundle-host comparison (`:75-80`) keeps using content-script matches only. `permissions` stays EXACTLY as is (no `identity`, `tabs`, `alarms`). DECISIONS.md entry and STATE.md "Standing hazards" updated.
- Accept: `npm run check` green on CI; unit test: `WIRE` round-trips all 5 states.
- Depends: none (any time); M13 needed before it is exercised end to end.

### D2 [dogear] Device sign-in in the service worker (deep, T, R)
- Files: `core/auth.js` (new, classic IIFE on `globalThis.Dogear`), `background.js` (importScripts plus message types `dogear:signin`, `dogear:signout`, `dogear:auth-status`), `library/library.html`, `library/library.js` (Account section: Sign in / signed-in-as / Sign out), `tests/auth.test.js`.
- Read: `background.js:11-14,151-174`; `core/store.js:4-9`; `library/library.js` (grep `sendMessage` for the message pattern and the `textContent` rule); dogear `.claude/CLAUDE.md` (no markup sinks; load order).
- Change: `signin()`: `POST /api/auth/device/code` -> `{device_code, user_code, verification_uri_complete, interval, expires_in}`; `chrome.tabs.create({url})`; poll `/api/auth/device/token` honouring `interval` and `slow_down`, abort at `expires_in`; on success store `{token, email, at}` under `auth` in `chrome.storage.local`. `signout()`: `POST /api/auth/sign-out` best effort, delete `auth`. Any 401 deletes `auth` and shows "Signed out". Only the library page and the background may call these (sender check as at `background.js:152`). The token is never logged, never in `D.toExport`, never in a message a content script can receive. Dogear stays fully functional signed out: no network call at all when `auth` is absent.
- Tests (`node --test`): polling state machine with injected fetch (pending, slow_down, denied, expired, success); signout clears storage; no fetch when signed out.
- Accept: `npm run check` green; user check: sign in from the library popup, see the approval page, popup shows the email.
- Depends: D1, M13.

### D3 [dogear] Push/pull sync, dirty queue, status UI, docs (deep, T, R)
- Files: `core/sync.js` (new), `core/store.js` (record dirty keys in `commit`; apply pulled entries), `background.js` (message `dogear:sync-now`; run after a debounced mark-change message and on `onStartup`), `library/library.js` and `library.html` (status line, "Sync now"), `core/states.js` (pseudo-platform `lorestep`, `hosts: []`), `scripts/check.mjs` (allow an empty-host platform), `tests/sync.test.js`, `README.md`, `DECISIONS.md`, `STATE.md`, `OPEN_ITEMS.md`.
- Read: `core/store.js:87-98,229-273,314-340,358-359,378-387`; `core/states.js:104-121`; `background.js:150-162`; `scripts/check.mjs:71-85`; M13 `docs/DOGEAR.md`.
- Change: dirty set `sync:dirty` (array of keys) in `chrome.storage.local`, written by `commit()` so a killed worker or offline browser loses nothing. `sync()` (service worker only, serialised by a module-level promise): push dirty marks in batches of 200 (`{platform, platformId, title, kind, url, status: D.WIRE[s] | null, at}`), clear the dirty keys present in `results`, then pull from the stored cursor `sync:cursor` with `kinds=movie,series,anime`, applying through `validEntry` (still the only trust barrier; failures are dropped) with LWW on `at` against `statusAt`. Pulled entries with a link for a known platform write `t:<platform>:<id>`; those without write `t:lorestep:<entryId>` so `normTitle` matching surfaces the status on tiles of other services. Network failure: keep the dirty set, back off, never block the UI. No `alarms`: triggers are mark change (debounced 3 s), browser start, popup open, and the manual button. Signed out: none of this runs, and `sync:*` keys are removed on sign-out. The local store stays the source while signed out. Document the flow and the data now leaving the device in README.
- Tests: dirty set survives a rejected fetch; push batching at 200; LWW at `at` ties; hostile pulled payloads (bad platform, huge title, control characters) dropped by `validEntry`; sign-out purges `sync:*`.
- Accept: `npm run check` green on CI; the manual Dogear e2e workflow still green signed out; user live check with a real account.
- Depends: D2, M13.

### P1 [plotline] Redirect to Lorestep (fast) - FINAL commit
- Files: `F:/projects/plotline/plotline/vercel.json` (new). `next.config.ts:22-30` already has `redirects()`; Vercel `vercel.json` redirects run before the app, so `next.config.ts` is untouched.
- Read: `plotline/next.config.ts:22-30`; `plotline/package.json:5-14`.
- Change: `{"redirects":[{"source":"/:path*","destination":"https://lorestep.akshitbansal.dev/","permanent":true}]}`. All paths go to the Lorestep root (routes do not map 1:1).
- Accept: after the user deploys, `curl -I https://plotline.akshitbansal.me/anything` returns 308 with `location: https://lorestep.akshitbansal.dev/` (verified over HTTP, not by reading the file).
- Depends: M1-M13 live in production with sign-up verified, and the user confirming the cutover.

## 8. Order and grouping

Critical path: M1, M2, M3, M4 (auth), then M5, M6, M7 (entries and tracker), then M12, M13 (account and sync), then D1-D3, then P1. Parallel after M3: M9 beside M5-M8. D1 can run any time. One executor batch: M10 plus M11 (same UI folder) after M8 and M9. `.env.example` and `docs/ROUTE-REGISTER.md` rows ride with their route milestones.

Tester after: M1, M3, M4, M6, M7, M8, M9, M10, M11, M12, M13, D1, D2, D3. Final `reviewer-deep` over: M3, M6, M7, M9, M12, M13, D2, D3 (auth, per-record authorization, SSRF, token handling, LWW). P1 needs only the live HTTP check.

## 9. Manual steps (user)

1. Neon: create a branch for CI; put its pooled URL in GitHub secret `DATABASE_URL_CI`.
2. GitHub: create Environment `production` with a required reviewer (gates `migrate.yml`; the YAML line enforces nothing until the environment exists). Run `migrate.yml` against production before deploying each migration milestone (M1 and M2 first, M5 next).
3. Vercel (Lorestep project): set the env vars in section 6; `BETTER_AUTH_URL=https://lorestep.akshitbansal.dev`; `CRON_SECRET` (Vercel sends it as the cron bearer).
4. OAuth apps (optional): GitHub OAuth app and Google OAuth client, callback `https://lorestep.akshitbansal.dev/api/auth/callback/<provider>`; add id and secret to Vercel.
5. Resend (optional): verify the sender domain, set `RESEND_API_KEY` and `MAIL_FROM`; reset is hidden without them.
6. Copy the TMDB, OMDb, MAL and IGDB/Twitch keys from the Plotline Vercel project into Lorestep's under the names in section 6.
7. Reload Dogear unpacked after D1-D3 and verify sign-in and sync with a real account.
8. Vercel (Plotline project): after P1, confirm `plotline.akshitbansal.me` stays attached and deploys; DNS unchanged.
9. FINAL, manual, no code planned: retire the Plotline GitHub repo and Vercel project. The Firebase project is left untouched.

## 10. Risks

- R1: Better-Auth stores the raw session token in `sessions.token` (DB-15 says store a hash); the Dogear bearer token is that same token. Mitigations: 256-bit random, 30 d absolute, revocable. Needs an explicit decision (Q2).
- R2: neon-http has no transactions; Better-Auth's adapter may need them. M3 may add a `neon-serverless` Pool for auth only.
- R3: `crypto.argon2` availability on the deployed runtime is unverified; M3 stops and asks rather than falling back to scrypt.
- R4: Plugin APIs (`deviceAuthorization`, `bearer`, `haveIBeenPwned`) are from my memory of the docs; executors must read the current docs before coding.
- R5: Hand-written SQL can drift from `schema.ts`; the e2e run on the CI branch is the only guard.
- R6: `resolve-link` SSRF; closed by `guard-url.ts`, the reviewer must probe it.
- R7: Lorestep sets no CSP or HSTS today (`next.config.ts`); out of scope here, to be logged in OPEN_ITEMS.md.
- R8: Title-only matching can mislink remakes; D-14 prefers duplicates over false merges.

## 11. Resolved questions (main session, 2026-11-08 — user delegated all decisions)

These override anything above that disagrees.

- Q1 `trash`: Lorestep's "not interested / hide" bucket. Keep as game shelf `trash` with `status=dropped`; mapper stays lossless (section 3).
- Q2 raw session token (R1, DB-15): before coding M3, the executor reads the current Better-Auth docs for a hashed-token storage option and uses it if one exists. If none: require signed tokens everywhere — `bearer({ requireSignature: true })` and the default signed session cookie — so a token read from the database alone cannot authenticate without `BETTER_AUTH_SECRET`. Record as an accepted deviation from DB-15 in DECISIONS.md and OPEN_ITEMS.md (revisit when Better-Auth ships token hashing). No hand-rolled session system.
- Q3 CSRF (D-17 superseded): comply with SEC-19 on Lorestep's OWN cookie-authenticated mutating routes: exact `Origin` check + a CSRF token (double-submit: `__Host-csrf` cookie, random 32 bytes, echoed in `x-csrf-token` header, constant-time compare) + `Content-Type: application/json`. Better-Auth's own `/api/auth/*` endpoints keep Better-Auth's built-in origin/CSRF protection; record only that as the SEC-19 deviation. Bearer (Dogear) requests are exempt (no ambient credential).
- Q4 sessions: 30 d absolute cap for browser and Dogear, no rolling extension past it (SEC-08); per-device revocation in `/account`.
- Q5 reCAPTCHA: dropped (user: Neon is the only service). Postgres limiter + HIBP replace it.
- R2 transactions: auth adapter uses a `drizzle-orm/neon-serverless` Pool client (WebSocket, transactions); catalog reads keep neon-http.
- R3 Argon2id (D-6): use `node:crypto` `argon2` and pin `"engines": { "node": ">=24.7" }` so Vercel runs Node 24+. If `@types/node` or CI's Node lacks it, fall back to `@node-rs/argon2` (pre-authorised; record in DECISIONS.md). Never scrypt, never lowered parameters.
- R6 SSRF: `resolve-link` accepts only `https:` URLs whose host is on an explicit allowlist of supported metadata/streaming hosts, follows no redirects to other hosts, and rejects IP literals.
- Commits in this repo use the project's `prefix/kebab-description` format (`.claude/CLAUDE.md` section 6), which is more specific than the global Conventional Commits rule.
- Provisioning (section 9 steps 1-6) is the user's. Until `DATABASE_URL_CI` exists, DB-backed CI jobs must skip with a visible notice, not fail and not fake a pass. Nothing merges to `main` (which deploys production) until the production migrations have run.
