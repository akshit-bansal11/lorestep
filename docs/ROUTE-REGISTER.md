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
