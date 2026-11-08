# Route register

SECURITY-SPEC SEC-03: every client-callable route and the gate it carries. A new route with no row
here fails review. Gates: `none` = public; `session` = Better-Auth session cookie; `bearer` = signed
bearer token (`bearer({ requireSignature: true })`); `csrf` = `assertSameOrigin` (exact Origin,
`application/json`, `x-csrf-token` equal to the `__Host-csrf` cookie). No route sends CORS headers.

| Method | Path | Gate | Limiter | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/prices` | none | none (ITAD concurrency 4) | Existing; spends the ITAD key. |
| GET, POST, PATCH, PUT, DELETE | `/api/auth/*` | Better-Auth (its own origin and CSRF checks) | Better-Auth, `storage: "database"` into `auth_rate_limits`, per IP; stricter `AUTH_RATE_RULES` | Sign-up/in/out, session, password reset (503 `reset_unavailable` without mail), social callbacks, device code/token/approve. |
| GET | `/api/v1/auth-providers` | none | 30/min per IP (`rate_limits`); unresolved IP = 403 | `{ github, google, reset }` booleans. |
| GET | `/api/v1/csrf` | none | none (no DB, no secret) | Sets `__Host-csrf` (HttpOnly, Secure, SameSite=Strict) and returns the same token. |
| GET | `/api/v1/metadata` | session or bearer | 60/min per user (`meta:<userId>`) | `?type&id&title&year`. Fans out to TMDB, OMDb, MAL/Jikan, IGDB; 502 `provider_unavailable` if MAL fails. Per-instance 5 min cache. |
| GET | `/api/v1/search` | session or bearer | 60/min per user (`search:<userId>`) | `?q&type`; at most 30 results; 502 only if every provider failed and nothing was found. |
| POST | `/api/v1/resolve-link` | session (`csrf`) or bearer | 30/min per user (`resolve:<userId>`) | `{url}`. SSRF guard (`guard-url.ts`): https only, no userinfo or port, no IP literal, host on an explicit allowlist, redirects followed by hand and only within the same host, body capped at 1 MB. 422 `unsupported_host` / `unresolvable`. |
| GET | `/api/v1/entries` | session or bearer | none | `?kind&status&q&cursor&limit` (limit clamped 1..100). Owner-scoped, live rows only; keyset cursor on `(updated_at, id)`; a cursor the server did not mint is 400. |
| POST | `/api/v1/entries` | session (`csrf`) or bearer | 120/min per user (`entries:<userId>`) | Body cap 64 KB (413). 201 Entry; 409 `duplicate` (unique game or external id) or `limit` (5000 live entries, checked in the INSERT). |
| GET, PATCH, DELETE | `/api/v1/entries/:id` | session (`csrf` on PATCH/DELETE) or bearer | 120/min per user on PATCH/DELETE (`entries:<userId>`) | Unknown, malformed or foreign id = 404. DELETE is soft (D-16) and, from a cookie caller, still needs `content-type: application/json` and the CSRF header. |
| PUT | `/api/v1/entries/game/:gameId` | session (`csrf`) or bearer | 120/min per user (`entries:<userId>`) | `{status: LibraryStatus\|null, device?, storefront?}`, replaced whole. 404 if the game is not in `games`; 204 when all three are cleared (soft delete). Updating a live row is uncapped; a new row goes through the create insert, so 409 `limit` / `duplicate` as POST. |
