# Lorestep for Chrome protocol

How Lorestep for Chrome (`extension/`, formerly Dogear) signs in to Lorestep and syncs marks
(PLAN.md section 12, N-4, N-12, N4). Client: `extension/core/auth.js` and `extension/core/sync.js`.
Origin: `https://lorestep.akshitbansal.dev`. Every sync call runs from the service worker with
`credentials: "omit"` (no cookies). Lorestep sends no CORS headers (D-10). JSON bodies,
`content-type: application/json`. The token is sent only to Lorestep and Neon Auth, never logged.

## Sign-in: OAuth 2.1 authorization code + PKCE, Neon Auth as the provider

Facts (production, 2026-11-09): issuer and Auth base `AUTH` =
`https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech/neondb/auth`; public client
`client_id` = `QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX` (not a secret); redirect URI =
`https://hemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org/` (`chrome.identity.getRedirectURL()`
for the pinned key; Neon accepted it); resource `RES` = `https://lorestep.akshitbansal.dev/api/v1/sync`;
consent is not skipped.

Authorize and token go to `AUTH` directly, NOT through Lorestep's `/api/auth` proxy. The proxy
re-fetches upstream with `fetch`'s default `redirect: "follow"`, so a proxied authorize would
follow Neon's 302 on the server and the browser would never reach the login page with Neon's
signed query (DECISIONS.md, "Dogear authorizes at the Neon Auth URL"). The Lorestep session cookie
is not needed at Neon: Neon always sends the browser to the Lorestep login page, which resumes the
request with its own first-party cookie.

1. `chrome.identity.launchWebAuthFlow({ url, interactive: true })` with (one line, encoded):

   ```text
   https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech/neondb/auth/oauth2/authorize
     ?response_type=code
     &client_id=QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX
     &redirect_uri=https%3A%2F%2Fhemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org%2F
     &scope=openid%20email%20offline_access
     &state=<STATE>
     &code_challenge=<BASE64URL_SHA256_OF_VERIFIER>
     &code_challenge_method=S256
     &resource=https%3A%2F%2Florestep.akshitbansal.dev%2Fapi%2Fv1%2Fsync
   ```

   `profile` is not requested (unused). `offline_access` is what returns a refresh token.
   Do not send `prompt=login` or `max_age=0`: Neon loops back to the login page with them.
2. The browser goes `AUTH/oauth2/authorize` -> `https://lorestep.akshitbansal.dev/oauth/login?<signed>`
   (sign in, or Continue if already signed in) -> `/oauth/consent?<signed>` (Allow / Deny; skipped
   by Neon once the same scopes and resource were approved) -> the redirect URI.
3. Result URL: accept it only if it starts with the redirect URI and its `state` equals yours.
   `?code=...&state=...` on Allow; `?error=access_denied&state=...` on Deny (show "Sign-in was
   cancelled", keep nothing). Any other `error` = show it as a failed sign-in.
4. Token request (form-encoded, `credentials: "omit"`, no client secret, public client):

   ```text
   POST AUTH/oauth2/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&code=<CODE>&code_verifier=<VERIFIER>
     &redirect_uri=https%3A%2F%2Fhemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org%2F
     &client_id=QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX
     &resource=https%3A%2F%2Florestep.akshitbansal.dev%2Fapi%2Fv1%2Fsync
   ```

   200 `{ access_token, token_type: "Bearer", expires_in, refresh_token, id_token, scope }`.
   Without `resource` on BOTH requests Neon issues an opaque token that Lorestep cannot verify.
   Keep the tokens only in the background worker's IndexedDB (never `chrome.storage.local`,
   which content scripts on the streaming sites can read); only `auth:status` lives there.
5. Refresh before `expires_in` runs out (access JWT about 1 h):

   ```text
   POST AUTH/oauth2/token
   grant_type=refresh_token&refresh_token=<REFRESH>&client_id=QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX
     &resource=https%3A%2F%2Florestep.akshitbansal.dev%2Fapi%2Fv1%2Fsync
   ```

   The refresh token lasts 30 days and rotates on every use: persist the new pair before using
   it. Exactly one refresh in flight: this branch has no MCP resource, so Neon has NO 30 s reuse
   window, and presenting an already-rotated refresh token revokes all of the user's refresh
   tokens for the extension (signed out everywhere). `invalid_grant` = delete tokens, show signed out.
   A network error keeps the tokens. The client shares one in-flight refresh promise and re-reads
   the stored pair inside it, so a caller still holding the old pair never presents it again
   (`extension/tests/auth.test.js`, "single flight").
6. Sync calls send `Authorization: Bearer <access_token>`. Lorestep verifies the EdDSA JWT
   against `AUTH/.well-known/jwks.json`: `iss` = `AUTH`, `aud` contains `RES` (with `openid` it is
   an array that also holds the userinfo URL), `exp`, `client_id` and a uuid `sub`. It is
   accepted ONLY on `/api/v1/sync*`; every other route is session-cookie only and answers 401.
   A 401 after one forced refresh means signed out: delete the tokens. 503 `auth_unavailable`
   means the key set is unreachable: retry later, keep the tokens.

"Signed in as": Neon's `id_token` carries NO `email` (Neon docs). Read it once after the token
exchange from `GET AUTH/oauth2/userinfo` with `Authorization: Bearer <access_token>` (needs the
`openid` and `email` scopes), validate with `EMAIL_RE`, store it next to the tokens. Display
only, never a trust decision.

Host permissions needed: the Lorestep origin and the `AUTH` origin
(`https://ep-noisy-king-bbgaaffj.neonauth.c-15.us-east-1.aws.neon.tech`).

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
  on_hold | dropped` (extension `D.WIRE.to`) or `null` to clear. `at` is epoch ms.
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

Discard the stored tokens. There is no server route: the extension holds no server-side session, and no
grant-revocation endpoint is documented (OPEN_ITEMS.md, accepted). A stolen refresh token stays
valid up to 30 days.
