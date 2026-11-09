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

## 12. Phase 2: Neon Auth (Managed Better Auth) replaces self-hosted Better-Auth

Decided 2026-11-09 (user): Neon is the only backend; auth = Neon Auth on the new Neon project; nothing builds or runs locally. This section overrides sections 2 to 11 wherever they conflict: D-2 (plugins), D-6 (Argon2id), D-7, D-8 (device flow), D-9 (token shape), D-11 (`auth_rate_limits`), D-18 (enumeration copy), Q2, Q4, Q5-HIBP, R1 to R4, M2, M3 (auth parts), M12 (sessions list, erase), M13 (`/device`, session-token pairing), D2, D3 (auth calls only). Kept as is: CSRF double-submit (Q3), the app limiter, entries/lists/sync logic, soft delete, purge of entries/lists. Nothing was ever deployed or migrated, so migrations are rewritten in place. Facts about Neon Auth come from the brief (neon.com docs, 2026-11); anything marked UNVERIFIED must be proven by a CI run, a preview deploy or a user command before it is relied on.

### 12.1 Decisions

| # | Decision | Reason |
|---|---|---|
| N-1 | Auth = `@neon/auth` 0.8.2 (`createNeonAuth`). Never `@neondatabase/auth` (older beta). `better-auth`, `argon2` code, device flow, the Dogear session column and token signing are deleted. | User decision; one managed service, no password or session code of ours. |
| N-2 | New runtime deps: `@neon/auth` (the only supported client of Neon Auth) and `jose` (verify the Dogear EdDSA JWT against the remote JWKS). Ladder: `node:crypto` can check an Ed25519 signature, but JWKS fetch, cache, key rotation, `alg` pinning and claim checks would be hand-written security code; `jose` is small, dependency-free and audited. Latest versions are read from the npm registry page by the N1 executor, not guessed. Lockfile by `lockfile.yml` (DECISIONS 2026-11-08); the N1 push is the first install, so it is deliberately tiny. | CLAUDE.md section 4 and 10 (new deps need an explicit say-so: this is it). |
| N-3 | `src/lib/auth/neon-auth.ts` exports lazy `neonAuth()` (like `db()`, never built at import, so `next build` and `check:static` need no auth env) = `createNeonAuth({ baseUrl: NEON_AUTH_BASE_URL, cookies: { secret: NEON_AUTH_COOKIE_SECRET, sessionDataTtl: 60, sameSite: "lax" } })`, every field explicit. `domain` unset (host-only cookie). TTL 60 s bounds how long a revoked session can still read as signed in (UNVERIFIED how Neon treats it). | SEC-07: pass `sameSite` explicitly because the docs disagree (None vs strict default). |
| N-4 | Guards. `requireUser(request)` = cookie session only, via `neonAuth().getSession()`, returns `{ userId, via: "session" }`; null session = 401; thrown upstream error = 503 `auth_unavailable` (fail closed, BE-06). `requireBearerUser(request)` = `Authorization: Bearer` JWT only, verified by `jose`: `createRemoteJWKSet(new URL(NEON_AUTH_BASE_URL + "/.well-known/jwks.json"))` (module-level, lazy), `jwtVerify(token, jwks, { issuer, audience, algorithms: ["EdDSA"] })`, then `payload.client_id === DOGEAR_OAUTH_CLIENT_ID` and `payload.sub` matches the uuid regex (else 401, never a 22P02 500). `audience` = `APP_ORIGIN + "/api/v1/sync"` (constant path in `src/constants/auth/auth.ts`). `issuer` = env `NEON_AUTH_ISSUER` if set, else `NEON_AUTH_BASE_URL` (Neon's `iss` format is UNVERIFIED; the user pastes the real value in 12.4 step 4). JWKS fetch failure = 503. Bearer is accepted ONLY on `/api/v1/sync*` (audience = the sync resource, least privilege): every other route that was "session or bearer" becomes session only. | JWT and cookie are different shapes, so the Dogear-token-sent-as-cookie replay class cannot exist: delete `sessions.client`, `rejectDogearSession`, `sign-session-token`, `session-token-from-headers`, `auth-hooks`, the device-token hook, `SESSION_CLIENTS`, `DeviceTokenContext`, `CredentialScan`. `AuthedUser` becomes `{ userId, via }`. `requireSessionUser` stays (string id); new `requireSessionAccount` returns `{ userId, email, name }` from `session.user` for export and erase. |
| N-5 | Route `src/app/api/auth/[...path]/route.ts` replaces `[...all]`: `export const { GET, POST, PUT, PATCH, DELETE } = neonAuth().handler()` wrapped (small `withAuthLimit`) so POST to `/sign-in/email`, `/sign-up/email`, `/request-password-reset` first hit the existing `enforceRateLimit` (10 per minute per IP, `auth:<ip>`; `clientIp` null = 403). Compensating control: Neon's own auth rate limits are undocumented. The handler also proxies `/oauth2/*` for the authorize leg (12.5, spike). | SEC-20. |
| N-6 | No `proxy.ts`. Protected pages already call the session on the server and redirect, and the brief shows no need beyond that. | Ladder rung 1. |
| N-7 | Env: add `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ chars), `NEON_AUTH_ISSUER` (optional), `DOGEAR_OAUTH_CLIENT_ID`, `APP_ORIGIN` (renamed from `BETTER_AUTH_URL`: it is the app's own origin for `assertSameOrigin` and the JWT audience), `AUTH_PROVIDERS` (comma list from `github,google`; Neon holds the provider secrets, so the app only needs to know which buttons to show), `AUTH_RESET` (`true` once custom SMTP is set). Remove `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_*`, `GOOGLE_CLIENT_*`, `RESEND_API_KEY`, `MAIL_FROM` (Neon sends the mail). `/api/v1/auth-providers` keeps its path, reads the two new envs. Delete `send-reset-email.ts`, `auth-env.ts` mail/oauth readers (keep `appOrigin()` reading `APP_ORIGIN`), `password.ts`, `check-device-request.ts`, `auth-db.ts` if unused. | Env renames need explicit instruction (section 10): this is it. |
| N-8 | Schema: only `rate_limits` stays ours. `entries`, `entry_links`, `lists`, `list_items` get `user_id uuid`; `entries.user_id` and `lists.user_id` are `REFERENCES neon_auth."user" (id) ON DELETE CASCADE`. Composite FKs are unchanged (their `user_id` becomes uuid to match). Drizzle: `pgSchema("neon_auth").table("user", { id: uuid("id").primaryKey() })` ONLY the id (column names of the managed table are UNVERIFIED, and we never select from it). Every raw `user_id = ${userId}` / `INSERT ... SELECT ${userId}` in `src/services` and `src/lib/db` gets a `::uuid` cast where Postgres cannot infer it (OPEN_ITEMS lists several untyped-param statements). `rate_limits.bucket` stays text. | The FK is the DB-11 guarantee that deletes cascade. |
| N-9 | Migration runner refuses to run unless `to_regclass('neon_auth."user"') IS NOT NULL`, with the message "Neon Auth is not enabled on this branch. Enable it (Console > Auth), then re-run." Checked before any migration, so a fresh database also needs Auth first. A plain local Postgres no longer migrates; accepted (nothing runs locally). | Clear failure instead of a Postgres "relation does not exist". |
| N-10 | Account. Sessions: the `/account` server component calls `neonAuth().listSessions()` and passes only `{ id, userAgent, createdAt, expiresAt, current }` to the client (never a token). `DELETE /api/v1/account/sessions/:id` (session only, CSRF) first checks the id is in the caller's `listSessions()` result (404 otherwise), then `revokeSession({ sessionId })`. Dogear is NOT listed (no server-side session). Erase: read-only email confirm against `session.user.email` (case-insensitive, 400 `confirm_mismatch`), then one CTE deleting `USER_TABLES` and the user's `rate_limits`, then `neonAuth().deleteUser()`; if `deleteUser` fails the data is already gone, the route answers 502 `erase_incomplete` and the UI tells the user to retry (idempotent). FK cascade stays as the backstop if the user is deleted from the Console. Export: profile from `session.user` (name, email, id), no read of `neon_auth`. | Fewer assumptions about the managed schema. `deleteUser()` may need a fresh session or password: UNVERIFIED, found by the e2e. |
| N-11 | Purge cron: drop `sessions`, `verifications`, `device_codes`, `auth_rate_limits`; keep soft-deleted entries/lists and `rate_limits`. `PurgeResult` loses four fields. `USER_TABLES` = `entry_links, list_items, lists, entries`. | Those tables no longer exist. |
| N-12 | Dogear sign-out = discard tokens locally. `POST /api/v1/sync/sign-out` is DELETED (nothing to revoke; a no-op route is dead code). `/api/auth/get-session` is no longer used by Dogear: "Signed in as" comes from the `email` claim of the `id_token` returned by the token endpoint (display only, no trust decision; scope `email`). | Ladder rungs 1 and 5. |
| N-13 | No webhooks used (`user.before_create`, `send.otp`, ...). Sign-up gating and mail templates stay at Neon defaults. | YAGNI; revisit if abuse appears. |
| N-14 | Email verification stays at the Neon default (off). Sign-up therefore signs the user in at once, and the "email already registered" copy (D-18) follows whatever Neon returns; the e2e records the real behaviour. | Not configurable in the brief. |

### 12.2 Security ledger (managed by Neon, not verifiable here)

Recorded as ONE DECISIONS.md entry "Neon Auth replaces Better-Auth" plus these OPEN_ITEMS.md "Accepted" rows (each with its revisit trigger), in N2. OPEN_ITEMS entries for R1 (raw token), the `__Secure-better-auth` cookie, the M3 follow-ups and the M13 device-pairing e2e are DELETED in the same commit.
- SEC-05 password hashing algorithm and cost: undocumented. Revisit when Neon documents it or a security review needs it.
- SEC-06 breached-password check and password length policy: undocumented; the app form keeps min 15 / max 128 client-side advisory only. Revisit as above.
- SEC-07 cookie: `__Secure-neon-auth.session_token`, not `__Host-`; `SameSite=Lax` is set by us, `HttpOnly`/`Secure` by Neon. Verified by the user in the browser dev tools after N3 (12.4 step 12). Revisit when Neon supports `__Host-`.
- SEC-08 session lifetime, idle timeout, rotation, revocation on password change: not configurable or documented. Revisit when documented.
- SEC-10/11 enumeration responses and sign-up copy: Neon-defined; the e2e asserts only what is observable (same message for wrong password and unknown email).
- SEC-19 on `/api/auth/*`: Neon's Origin allowlist (trusted domains) replaces Better-Auth's checks.
- SEC-20 auth endpoint rate limits: Neon-side undocumented; compensated by N-5 (one more layer, not proof).
- DB-15 / credential storage: tokens and hashes live in Neon-managed tables we never read. Closes R1 as "not ours".
- Audit log of auth events: Neon console only. Revisit if an incident review needs it.
- Dogear token revocation: no revocation endpoint is documented, and deleting the client does not revoke issued tokens. A stolen refresh token lives up to 30 days (access JWT 1 h). Mitigation: tokens only in `chrome.storage.local`, never logged, refresh rotates. UNVERIFIED whether a password change or `revokeOtherSessions` invalidates grants. Revisit when Neon documents grant revocation or a per-user grant list; then add a "Connected apps" card to `/account`.
- Availability: Neon Auth outage means no sign-in and 503 on session routes; signed-out tracking is unaffected.
- SEC-22 erasure is ours up to `deleteUser()`; proof is the e2e (sign-in fails after erase).

### 12.3 Milestones

Global rules of section 7 apply. Commits stay green: N1 is additive, N2 swaps the server while the old client files still compile (the `better-auth` package stays installed until N3), N3 swaps the UI and removes the package. The branch is not functional between N2 and N3; nothing is deployed from it.

#### N1 [lorestep] Additive foundation: deps, `neon-auth.ts`, bearer verifier (deep, T)
- Files: `package.json` (add `@neon/auth`, `jose`; prefix `add-p/`), `src/lib/auth/neon-auth.ts`, `src/lib/auth/verify-dogear-token.ts`, `src/lib/auth/verify-dogear-token.test.ts`, `src/constants/auth/auth.ts` (add `DOGEAR_AUDIENCE_PATH`, `UUID_RE`), `.env.example` (add the N-7 names, do not remove old yet).
- Read: `src/lib/db/client.ts:17-27` (lazy pattern); `src/lib/auth/require-user.ts:18-31`; `src/constants/auth/auth.ts` (whole); published type declarations of `@neon/auth@0.8.2` and `jose` (unpkg/GitHub), because nothing is installable here.
- Change: per N-1 to N-4. `verifyDogearToken(token, deps)` is pure over an injected `jwtVerify` and key resolver so tests need no network. Does NOT touch the old guards yet.
- Tests: valid token passes; wrong `iss`, wrong `aud`, wrong `client_id`, `alg: none`/RS256/HS256 header, expired, `sub` not a uuid, empty token all reject with 401; JWKS network error maps to 503.
- Accept: `check:ci` green after the lockfile bot commit; `check:static` still prerenders the content routes.
- Depends: none. Executor: deep (JWT verification).

#### N2 [lorestep] Server cutover: migrations, schema, guards, route, services, sync (deep, T, R)
- Files: `db/migrations/0001_auth_tables.sql` (+down; keep the filename so PR #8 merges cleanly: contents become `rate_limits` only, header comment updated), `db/migrations/0002_log_tables.sql` (+down; uuid `user_id`, FK to `neon_auth."user"`), `scripts/migrate.mjs` (N-9 check before the loop), `src/lib/db/schema.ts` (drop auth tables, add `neonAuthUser`, uuid user ids), `src/lib/auth/{require-user,require-session-user,require-bearer-user}.ts` (+tests), new `require-session-account.ts`, `src/lib/http/guard-mutation.ts`, `src/lib/http/assert-same-origin.ts` (+test; uses `APP_ORIGIN`), `src/app/api/auth/[...path]/route.ts` (delete `[...all]`), `src/lib/http/with-auth-limit.ts`, `src/app/api/v1/auth-providers/route.ts`, `src/app/api/v1/sync/{route.ts,push/route.ts}` (bearer guard), DELETE `src/app/api/v1/sync/sign-out/route.ts`, `src/services/account/{erase,export,sessions,purge,user-tables}.ts` (+tests), `src/types/account/account.ts`, `src/app/api/v1/account/**`, `src/app/(site)/{library,lists,lists/[id],account}/page.tsx` (server session via `neonAuth().getSession()`; account page lists sessions per N-10), DELETE `src/app/(site)/device/page.tsx`, `src/components/auth/DeviceApproval.tsx`, `src/lib/auth/{auth,auth-hooks,password,sign-session-token,session-token-from-headers,check-device-request,send-reset-email,auth-db}.ts` and their tests, `src/types/auth/auth.ts`, every `/api/v1/*` route that said "session or bearer" (now `requireUser`), `docs/ROUTE-REGISTER.md`, `docs/DOGEAR.md` (new contract: OAuth, bearer JWT, no sign-out route), `DECISIONS.md`, `OPEN_ITEMS.md`, `STATE.md`.
- Read: `src/lib/auth/require-user.ts:1-31`, `require-session-user.ts`, `require-bearer-user.ts`; `src/services/account/{erase,sessions,export,purge,user-tables}.ts` (whole); `src/lib/http/{guard-mutation,assert-same-origin}.ts`; `db/migrations/0001_auth_tables.sql:80-95` (the `rate_limits` block to keep) and `0002_log_tables.sql:8,81,104,128`; `src/lib/db/schema.ts:132-300,324-335,410-415,446-455,482-492`; `scripts/migrate.mjs:51-66`; `docs/ROUTE-REGISTER.md` (whole); grep `user_id` in `src/services` and `src/lib/db` for raw SQL needing `::uuid`; grep `getAuth|BETTER_AUTH|from "@/lib/auth/auth"` to prove zero consumers before each delete.
- Change: exactly N-4 to N-11. `rate-limit.ts` and `enforceRateLimit` unchanged. Down files: 0001 drops `rate_limits`; 0002 unchanged in structure. DECISIONS.md gets the one Neon entry (12.2) plus a one-line pointer on each superseded entry's topic (append, never edit old entries). Route register: `/api/auth/*` row = Neon Auth proxy; remove `/device`, `/sync/sign-out`, the device-code rows; "session or bearer" rows become "session"; sync rows keep "bearer only" with the JWT description.
- Tests: guards (cookie ok, no cookie 401, upstream throws 503, bearer on a session-only route is 401); `withAuthLimit` (429 after cap, null IP 403, non-auth paths untouched); erase (mismatched email deletes nothing; `deleteUser` failure gives 502 and rows still gone; other users untouched); sessions revoke refuses an id not in `listSessions()`; purge SQL no longer mentions dropped tables; export has no credential key; migrate-order test still passes.
- Accept: `check:ci` green; `rg "better-auth|BETTER_AUTH" src` finds only `auth-client.ts` and the components N3 replaces; route register has no stale row; every `user_id` raw-SQL parameter is cast or compared against a uuid column.
- Depends: N1. Executor: deep.

#### N3 [lorestep] UI on the `@neon/auth` client; remove `better-auth` (std, T)
- Files: `src/lib/auth/auth-client.ts` (`createAuthClient` from `@neon/auth/next`), `src/lib/auth/auth-call.ts`, `src/hooks/auth/{use-session,use-auth-form,use-auth-providers}.ts`, `src/components/auth/{SignInForm,SignUpForm,ResetRequestForm,ResetPasswordForm,OAuthButtons,AccountMenu}.tsx`, `src/components/account/{DevicesList,DeleteAccount,ProfileCard}.tsx`, `src/lib/api/account-client.ts`, `src/constants/auth/copy.ts`, `e2e/auth.spec.ts`, `e2e/account.spec.ts`, `package.json` (remove `better-auth`; prefix `rem/`).
- Read: each component above (whole; they are small); `src/types/auth/auth-form.ts`; `src/components/auth/AccountMenu.tsx` (`useSession` use); the `@neon/auth` client method names (`signIn.email`, `signIn.social`, `signUp.email`, the password-reset pair) from the package types/docs; UI-SPEC and UX-SPEC before touching markup.
- Change: same look, copy and states (loading, error, offline). Forms call `authClient.signIn.email` / `signUp.email` / `signIn.social({ provider })`; OAuth buttons render for the providers `/api/v1/auth-providers` reports; reset request form is hidden when `reset` is false. `AccountMenu` uses `authClient.useSession()` so the header stays static. `/account`: DevicesList renders the sessions the server component passes (current one marked, no Revoke on it), Revoke calls the CSRF route; DeleteAccount keeps type-your-email. `/device` has no link left anywhere. `/sign-in?next=` keeps same-origin path only.
- Tests: component tests keep their mocked-client pattern (`vi.mock` the new client); e2e (CI branch): sign-up on localhost (pre-approved domain), menu, sign-out, sign-in, wrong password and unknown email show the same message, erase then sign-in fails (SEC-22), export has no credential key. WebKit/Firefox projects, if present in `playwright.config.ts`, may refuse a `__Secure-` cookie on `http://localhost`: if so run auth e2e on Chromium only and note it in OPEN_ITEMS.
- Accept: `check:ci` green; `rg "better-auth" .` finds only history docs; axe clean on `/sign-in`, `/sign-up`, `/account`.
- Depends: N2. Executor: std.

#### N4 [lorestep] OAuth provider pages for Dogear (deep, T, R)
- Files: `src/app/(site)/oauth/login/page.tsx`, `src/app/(site)/oauth/consent/page.tsx`, `src/components/auth/ConsentCard.tsx`, `src/lib/auth/continue-oauth.ts` (+test), `src/constants/auth/oauth.ts` (scope labels, Dogear client name), `e2e/oauth-pages.spec.ts`.
- Read: Neon docs, OAuth provider page (login and consent page contract, `oauth_query`, `POST /oauth2/consent`); `src/components/auth/SignInForm.tsx` (after N3); `src/app/(site)/sign-in/page.tsx` (`next` handling); `src/lib/auth/neon-auth.ts`.
- Change: `/oauth/login` renders the existing sign-in form; after sign-in (or immediately if already signed in) it sends the browser back to the authorize endpoint with the untouched `oauth_query`. The return URL is built by `continue-oauth.ts` ONLY as `<allowed authorize base>/oauth2/authorize?` + `oauth_query`, never from a free `next` value (open-redirect guard); `oauth_query` is length-capped and must be a query string. `/oauth/consent` (session required, dynamic, `noindex`) shows "Dogear wants to: read and change your marks (sync)", the account email, [Allow] [Deny]; both POST `/oauth2/consent` with `oauth_query` and navigate to the returned `{ url }` (same allowlist check). Mockup: `Dogear (browser extension) wants to sync your marks / Signed in as you@x / [Deny] [Allow]`. SPIKE (decides where the authorize leg runs; record the result in DECISIONS.md): the session cookie is set on the Lorestep origin, so the authorize call may need to go through the proxy (`APP_ORIGIN/api/auth/oauth2/authorize`, option B) instead of the Neon URL (option A). Default B. Dogear (N7) is coded against whichever the spike proves.
- Tests: `continue-oauth` rejects foreign hosts, `javascript:`, protocol-relative and oversized values; consent page redirects to `/sign-in` when signed out (keeps `oauth_query`); e2e covers the pages only up to the redirect (no Dogear in CI).
- Accept: `check:ci` green; USER SPIKE (12.4 step 11) shows the full browser round trip landing on the `chromiumapp.org` redirect with a `code`; result recorded.
- Depends: N3. Executor: deep.

#### N5 [lorestep] CI, workflows, env docs, PR #8 mirror (std)
- Files: `.github/workflows/ci.yml` (e2e job env: `NEON_AUTH_BASE_URL` from secret `NEON_AUTH_BASE_URL_CI`, `NEON_AUTH_COOKIE_SECRET` random per run, `APP_ORIGIN=http://localhost:3001`, `DOGEAR_OAUTH_CLIENT_ID=ci`; replace the `BETTER_AUTH_*` lines; skip notice also fires when either CI secret is missing), `.github/workflows/migrate.yml` (comment: Neon Auth must be enabled on production first), `.env.example`, `playwright.config.ts` (webServer env names), `OPEN_ITEMS.md` (Unprovisioned: the two CI secrets), `README.md` (env table if it lists auth env), then on branch `add/production-migrations` (PR #8) the SAME bytes of `db/migrations/0001_auth_tables.sql`, `.down.sql`, `0002_log_tables.sql`, `.down.sql` and `scripts/migrate.mjs` as N2 produces.
- Read: `.github/workflows/ci.yml:57-135`; `playwright.config.ts`; `.env.example`; `git diff feat/merge-plotline-dogear..add/production-migrations --stat` (git is allowed locally).
- Change: as listed. PR #8 mirror is a copy of byte-identical files, so merging either branch first leaves the other with an empty diff for them. Order: N2 first, then mirror.
- Accept: `check:ci` green on both branches; `git diff <branch> <branch> -- db/migrations scripts/migrate.mjs` is empty.
- Depends: N2 (parallel with N3, N4). Executor: std.

#### N6 [dogear] Manifest and check.mjs for OAuth (fast)
- Files: `manifest.json` (add `"identity"` to `permissions`; add `"key"`; add the Neon Auth origin to `host_permissions`; version 0.8.0), `package.json` (0.8.0), `scripts/check.mjs`, `DECISIONS.md`.
- Read: `manifest.json:14-15`; `scripts/check.mjs:40-70`.
- Change: `check.mjs` ALLOWED permissions gain `identity`; `host_permissions` must equal exactly the Lorestep origin plus the Neon Auth origin (constants at the top of the script); `key` must be present and look like base64 (the check never prints it). `externally_connectable`, `web_accessible_resources` and `optional_host_permissions` stay forbidden. DECISIONS: why `identity`, why a pinned `key` (stable id for unpacked installs, so `https://<id>.chromiumapp.org/` is a registered redirect URI), D-9 trade-off unchanged.
- Accept: `npm run check` green on CI.
- Depends: user supplies the public key and the Neon Auth URL (12.4 steps 3 and 7). Executor: fast.

#### N7 [dogear] OAuth 2.1 Authorization Code + PKCE client (deep, T, R)
- Files: `core/auth.js` (replace internals; keep the returned API `signIn, signOut, status, call, signedIn` so `core/sync.js` and `background.js` change nothing), `tests/auth.test.js`, `library/library.js` and `library.html` (copy only: no more user code), `README.md`, `STATE.md`, `OPEN_ITEMS.md`.
- Read: `core/auth.js` (whole, 216 lines); `core/sync.js:119,185,244,284-299` (call sites of `auth.call` / `signedIn`); `background.js:174-210` (message handlers); `tests/auth.test.js`; N4's recorded spike result (authorize base).
- Change: `signIn()`: random `state` and PKCE `code_verifier` (`crypto.getRandomValues`, 64 chars), `code_challenge` = base64url SHA-256 (`crypto.subtle`); `chrome.identity.launchWebAuthFlow({ url: <authorize base>/oauth2/authorize?response_type=code&client_id&redirect_uri=chrome.identity.getRedirectURL()&scope=openid profile email offline_access&resource=<ORIGIN>/api/v1/sync&state&code_challenge&code_challenge_method=S256, interactive: true })`; accept the result only if it starts with the redirect URI and `state` matches; `POST <Neon Auth>/oauth2/token` (form-encoded, `credentials: "omit"`) with `grant_type=authorization_code`, `code`, `code_verifier`, `redirect_uri`, `client_id`, `resource`. Store `{ accessToken, refreshToken, expiresAt, email }` under `auth` in `chrome.storage.local` (never in a message, never logged, not in `D.toExport`). `stored()` refreshes when the access token has under 60 s left: one in-flight refresh (module-level promise), new refresh token persisted BEFORE use (rotation); `invalid_grant` = delete tokens and show "Signed out"; network error keeps tokens and reports offline. `call()` keeps its contract (null and no request when signed out; a 401 after one forced refresh deletes tokens). `signOut()` = delete tokens and `sync:*` keys, no network. `email` read from the `id_token` payload (base64url JSON, display only, validated with the existing `EMAIL_RE`). Token response fields validated before use (type, length, `token_type` Bearer). The `/device` pairing, polling, `pollStep`, `GRANT`, `USER_CODE_RE` code is deleted.
- Tests (`node --test`): PKCE challenge matches a known S256 vector; wrong `state` rejected; redirect with `error=access_denied` gives status denied; refresh dedupes concurrent calls; rotation persists the new refresh token before the retry; `invalid_grant` signs out; offline keeps tokens; no fetch when signed out; signOut makes no request.
- Accept: `npm run check` green on CI; USER LIVE CHECK (12.4 step 13): unpacked reload, Sign in opens the Lorestep login and consent pages, popup shows the email, a mark syncs, a second sync after 61 minutes refreshes silently.
- Depends: N4 (spike proven), N6. Executor: deep.

#### N8 Final review (reviewer-deep)
- Scope: N1, N2, N4, N7 plus the PR #8 mirror. Probe: bearer verification (alg pinning, issuer, audience, `client_id`, `sub` shape, JWKS failure is not fail-open); a cookie on a bearer-only route and a JWT on a cookie route both refused; per-record authorization on every route after the `::uuid` change; open-redirect in `continue-oauth` and `/sign-in?next`; erase ordering and the 502 path; no token in any log, message or export; `Origin`/CSRF still on every cookie mutation; the Dogear extension never sends the token to a non-Lorestep, non-Neon origin; the ledger in 12.2 is complete and each row has a revisit trigger.
- Depends: N2, N4, N5, N7.

Order: N1, N2, then N3 / N5 / N6 in parallel, then N4, then N7, then N8. Tester after N1, N2, N3, N4, N7. DOGEAR.md was written in N2 and is amended in N7 only if the spike changes the authorize base.

### 12.4 User provisioning (you run these; placeholders in angle brackets)

Needed BEFORE code can be verified: steps 1 to 5 and 8 (N2 e2e and review); 6 to 7 and 9 to 11 (N4); 12 to 13 (N3 and N7). N1 to N3 unit/type work needs none of them.
1. Neon Console > your project > production branch > Auth > Enable Neon Auth. Copy the Auth URL: it is `NEON_AUTH_BASE_URL` for production.
2. Console > Auth > Configuration > Domains: add only `https://lorestep.akshitbansal.dev`. Neon allows `*` only as the whole leftmost label, and Vercel preview hosts are single labels under `vercel.app`, so the only matching wildcard (`https://*.vercel.app`) would trust every Vercel site: do not add it. Previews build but cannot sign in; CI uses `localhost` (pre-approved). For pre-merge sign-in tests, give a branch a fixed Vercel domain (e.g. `staging.lorestep.akshitbansal.dev`) and add that exact origin.
3. Create the extension key (Git Bash; the `.pem` is a secret, keep it OUT of both repos): `openssl genrsa -out dogear-key.pem 2048`, public key for the manifest: `openssl rsa -in dogear-key.pem -pubout -outform DER | openssl base64 -A`, extension id: `openssl rsa -in dogear-key.pem -pubout -outform DER | openssl dgst -sha256 -binary | head -c 16 | xxd -p | tr '0-9a-f' 'a-p'`. Send me the public key and the id (not the .pem). Record in dogear OPEN_ITEMS: a Chrome Web Store build gets its own id, so add that id's redirect URI to the client then.
4. Verify the facts the code depends on, and paste the output to me: `curl -s <NEON_AUTH_BASE_URL>/.well-known/openid-configuration` (note `issuer`), `curl -s <NEON_AUTH_BASE_URL>/.well-known/jwks.json` (expect an Ed25519 key), and in the Neon SQL editor `select column_name, data_type from information_schema.columns where table_schema = 'neon_auth' and table_name = 'user';` (expect `id` = uuid).
5. Create the CI branch AFTER step 1 so it inherits Auth: `neonctl branches create --project-id <PROJECT_ID> --name ci --parent <production-branch>` (or Console > Branches). If Auth is not enabled on it, enable it there (Console > ci branch > Auth). Copy the ci Auth URL.
6. Enable the OAuth provider on production: Console > Auth > Settings > Better Auth > OAuth provider > Enable, login page `https://lorestep.akshitbansal.dev/oauth/login`, consent page `https://lorestep.akshitbansal.dev/oauth/consent`. API alternative (body shape UNVERIFIED, check the Neon API reference first): `curl -X PATCH "https://console.neon.tech/api/v2/projects/<PROJECT_ID>/branches/<BRANCH_ID>/auth/plugins/oauth-provider" -H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json" -d '{"enabled":true,"login_page":"https://lorestep.akshitbansal.dev/oauth/login","consent_page":"https://lorestep.akshitbansal.dev/oauth/consent"}'`.
7. Register Dogear (after step 3; the redirect must be exactly `https://<EXT_ID>.chromiumapp.org/`; Neon accepting it is UNVERIFIED and is the first thing the spike proves): `curl -X POST "https://console.neon.tech/api/v2/projects/<PROJECT_ID>/branches/<BRANCH_ID>/auth/oauth-provider/clients" -H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json" -d '{"name":"Dogear","type":"public","redirect_uris":["https://<EXT_ID>.chromiumapp.org/"],"resources":["https://lorestep.akshitbansal.dev/api/v1/sync"]}'`. Send me the returned `client_id` (set it as `DOGEAR_OAUTH_CLIENT_ID`). If Neon rejects the redirect, stop and tell me: the fallback is a Lorestep-hosted redirect page that hands the code to the extension.
8. Vercel > Lorestep > Settings > Environment Variables (Production; Preview optional): `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (`openssl rand -base64 48`), `NEON_AUTH_ISSUER` (only if step 4 shows it differs), `DOGEAR_OAUTH_CLIENT_ID`, `APP_ORIGIN=https://lorestep.akshitbansal.dev`, `AUTH_PROVIDERS` (empty until step 14), `AUTH_RESET` (`false` until step 14), plus the existing `DATABASE_URL`, `CRON_SECRET` and provider keys. Remove `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_*`, `GOOGLE_CLIENT_*`, `RESEND_API_KEY`, `MAIL_FROM`. Preview should use a Neon `preview` branch made after step 1, not production data.
9. GitHub repo secrets: `NEON_AUTH_BASE_URL_CI` (step 5), `DATABASE_URL_CI`, and the existing `DATABASE_URL`. GitHub Environment `production-migrations` with a required reviewer (name per OPEN_ITEMS, not `production`).
10. Run the `Migrate production` workflow only after N2 and N5 are merged to `main`'s migration PR and step 1 is done; it fails with the N-9 message otherwise.
11. Spike (after N4 is on a Vercel preview and steps 6 to 8 are done): open the authorize URL N4 documents in a normal browser tab with the Dogear redirect; expect the Lorestep login, then consent, then a redirect to `https://<EXT_ID>.chromiumapp.org/?code=...&state=...`. Send me what you see at each hop.
12. After N3 on a preview: sign up, then in browser dev tools > Application > Cookies confirm the cookie name, `Secure`, `HttpOnly`, `SameSite=Lax`, and that it is host-only.
13. After N7: Chrome > Extensions > Developer mode > Reload Dogear (id must equal `<EXT_ID>`), Sign in, approve, mark a title, watch it appear in `/library`.
14. Optional: GitHub OAuth app, callback `<NEON_AUTH_BASE_URL>/callback/github`, id and secret into Console > Auth > Providers; Google needs your own client for production (Neon's shared one is dev only), same callback shape. Custom SMTP: Console > Auth > Configuration (SMTP section) because Neon's shared SMTP is dev-only and rate-limited. Then set `AUTH_PROVIDERS=github,google` and `AUTH_RESET=true` in Vercel.

Deploy order replaces section 8's STATE.md order: steps 1 to 9, merge PR #8 (runner and rewritten migrations), run Migrate production, merge PR #7, verify sign-up live, then dogear#1 (this phase's N6 and N7 included), then plotline#9.

### 12.5 Risks

- Authorize leg across origins (top risk): the session cookie lives on the Lorestep origin, so Neon's authorize endpoint may not see it. The N4 spike picks proxy (B) or Neon URL (A). If neither works, the Dogear device flow cannot return (Neon has no device grant in the brief) and the fallback is a Lorestep-issued pairing, which re-opens D-8: stop and ask.
- `chromiumapp.org` as an accepted redirect URI, issuer string format, `resource` plumbing, and `launchWebAuthFlow` surviving a service-worker restart mid-flow: all UNVERIFIED.
- Rotating refresh tokens: two workers refreshing at once burn the grant (user signs in again). Mitigated by the single in-flight promise and persist-before-use; not provable offline.
- Managed-schema coupling: the FK to `neon_auth."user"` and `deleteUser()` assume the schema name, `uuid` id and cascade behaviour in the brief. A Neon schema change breaks migrations/erase; the N-9 check and the e2e erase test are the tripwires.
- Library API surface is from the brief and package version 0.8.2 (pre-1.0): method names (`listSessions`, `revokeSession({ sessionId })`, password reset pair) may differ; CI typecheck is the only proof. Pin exact `0.8.2` (no caret) until the lockfile bot has run.
- Preview deployments share the production Auth config unless a separate branch is used (step 8).
- Neon outage = no sign-in (12.2). Cookie `sessionDataTtl` means a revoked session can read as signed in for up to 60 s.
- PR #8 and PR #7 both carry the same migrations: the byte-identical rule in N5 must hold after any later edit to either.
