# Dogear protocol

How the Dogear extension pairs with Lorestep and syncs marks. Origin:
`https://lorestep.akshitbansal.dev`. Every call runs from the service worker with
`credentials: "omit"` (no cookies; Better-Auth checks the Origin only on cookie requests). Lorestep
sends no CORS headers (D-10). JSON bodies, `content-type: application/json`.

## Pairing (RFC 8628, Better-Auth `deviceAuthorization`)

1. `POST /api/auth/device/code` `{ "client_id": "dogear" }` returns `{ device_code, user_code,
   verification_uri, verification_uri_complete, expires_in, interval }`.
2. Open `verification_uri_complete` (`/device?user_code=…`) in a tab. The user signs in, sees the
   code and what Dogear may do, and presses Approve or Deny.
3. Poll `POST /api/auth/device/token` `{ "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
   "device_code", "client_id": "dogear" }` every `interval` seconds. Errors are 400
   `{ error, error_description }`: `authorization_pending` (keep polling), `slow_down` (add 5 s),
   `access_denied`, `expired_token`, `invalid_grant` (stop).
4. Success: `{ access_token, token_type: "Bearer", expires_in, scope }`. `access_token` is already
   signed (`token.signature`); store it as is and send `Authorization: Bearer <access_token>`.
   It lasts 30 days and is listed in `/account` as "Dogear (Chrome)", where the user can sign it
   out. Any 401 means signed out: delete the token.

## Push: `POST /api/v1/sync/push` (bearer only; a cookie caller gets 403)

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

## Who is signed in: `GET /api/auth/get-session` (bearer)

Better-Auth's own endpoint, called with `Authorization: Bearer <access_token>`. 200
`{ session, user }`; show `user.name` / `user.email` as "Signed in as". A body of `null` means the
token no longer names a session: delete it. Rate-limited by Better-Auth per IP.

## Sign out: `POST /api/v1/sync/sign-out` (bearer only; a cookie caller gets 403)

No body. Deletes exactly the session the token belongs to (owner and id scoped), then 204. Safe
to resend: once the row is gone the token answers 401, which already means signed out. Delete the
stored token either way. 10 requests a minute per user (`sync-signout:<userId>`), then 429.
