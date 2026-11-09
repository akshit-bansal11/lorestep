# Dogear protocol

How the Dogear extension signs in to Lorestep and syncs marks (PLAN.md section 12, N-4, N-12).
Origin: `https://lorestep.akshitbansal.dev`. Every sync call runs from the service worker with
`credentials: "omit"` (no cookies). Lorestep sends no CORS headers (D-10). JSON bodies,
`content-type: application/json`. The token is sent only to Lorestep and Neon Auth, never logged.

## Sign-in: OAuth 2.1 authorization code + PKCE, Neon Auth as the provider

1. `chrome.identity.launchWebAuthFlow` opens the authorize URL with `client_id` =
   `DOGEAR_OAUTH_CLIENT_ID`, `response_type=code`, PKCE (`S256`), `state`, `scope` including
   `email`, `resource` = `APP_ORIGIN/api/v1/sync`, and `redirect_uri` =
   `https://<EXT_ID>.chromiumapp.org/`. Authorize base: `APP_ORIGIN/api/auth/oauth2/authorize`
   (the proxy, option B) by default; UNVERIFIED until the N4 spike, which may switch it to the Neon
   Auth URL (option A). This file is amended in N7 if it does.
2. The user signs in on Lorestep and approves Dogear on the consent page.
3. Exchange the returned `code` at the token endpoint (same base, `/oauth2/token`) for
   `{ access_token, refresh_token, id_token, expires_in }`. Keep all three only in
   `chrome.storage.local`.
4. Send `Authorization: Bearer <access_token>` to the sync routes. The access token is an EdDSA JWT
   (about 1 h) that Lorestep verifies against `NEON_AUTH_BASE_URL/.well-known/jwks.json`: `iss`,
   `aud` = `APP_ORIGIN/api/v1/sync`, `exp`, `client_id` and a uuid `sub`. It is accepted ONLY on
   `/api/v1/sync*`; every other route is session-cookie only and answers 401 to it.
5. Refresh with the rotating `refresh_token` (up to 30 days) before expiry, one refresh in flight
   at a time, persisting the new pair before use. A 401 from sync after a refresh means signed out:
   delete the tokens. 503 `auth_unavailable` means the key set is unreachable: retry later, keep
   the tokens.

"Signed in as" is the `email` claim of the `id_token` (display only, never a trust decision).

## Push: `POST /api/v1/sync/push` (bearer only; a cookie caller gets 401)

```json
{ "marks": [{ "platform": "netflix", "platformId": "81234", "title": "The Boys",
  "kind": "series", "url": "https://www.netflix.com/title/81234",
  "status": "in_progress", "at": 1762600000000 }] }
```

- 1 to 200 marks, body at most 256 KB, applied in order. `platform` is one of `netflix`,
  `primevideo`, `hotstar`, `zee5`, `hbomax`, `crunchyroll`; anything else is 400. `platformId`
  matches `^[A-Za-z0-9_-]{1,128}$`. `kind` is `movie`, `series`, `anime` or `""`/absent (unknown);
  `url` https or `""`/absent; `year` optional. `status` is `planned | in_progress | completed |
  on_hold | dropped` (Dogear `D.WIRE.to`) or `null` to clear. `at` is epoch ms.
- Entry choice (D-14): an existing link for `(platform, platformId)`, else the single live entry
  with the same normalised title and a compatible kind, else a new entry. Two or more candidates
  always create.
- Last write wins: a mark applies only if `at` is later than the entry's `statusAt` (`at` is
  clamped to now + 5 min). Resending a push changes nothing.
- A clear sets the status to null and soft-deletes the entry unless it has a rating, notes, a
  shelf or a list membership (D-15). A clear for a title the server never had is skipped.
- 200 `{ data: { applied, skipped, results: [{ platform, platformId, entryId, status,
  statusAt }] } }`. Clear the dirty keys present in `results`. 409 `limit` at 5000 entries.

## Pull: `GET /api/v1/sync?since=<cursor>&limit=<1..500>&kinds=movie,series,anime` (bearer only)

- 200 `{ data: { changes: [{ entry, links: [{ platform, platformId, url }], deleted }],
  cursor } }`, oldest change first. `entry` is the Entry JSON of `/api/v1/entries`;
  `deleted: true` is a tombstone (kept 30 days). Store `cursor` and pass it as `since`; repeat
  while a page comes back full. With nothing new, `cursor` is `since` unchanged. A cursor the
  server did not mint is 400 `invalid_cursor`: pull again without `since`.

Both sync routes: 60 requests a minute per user, then 429 with `Retry-After`.

## Sign out

Discard the stored tokens. There is no server route: Dogear holds no server-side session, and no
grant-revocation endpoint is documented (OPEN_ITEMS.md, accepted). A stolen refresh token stays
valid up to 30 days.
