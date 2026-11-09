# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 12, Neon Auth,
  overrides the rest). Nothing is deployed from this branch.
- Done: M1-M13 (Better-Auth era), then the Neon Auth cutover N1-N5 and N7: `@neon/auth` 0.8.2,
  cookie-only `requireUser`, bearer-JWT-only sync, migrations 0001/0002 (FK to
  `neon_auth."user"`), account sessions, export and erase on Neon Auth, `/oauth/login` and
  `/oauth/consent`, and the Chrome extension in `extension/` as "Lorestep for Chrome" (authorize,
  token and userinfo at the Neon Auth URL; DECISIONS.md 2026-11-09).
- Final security review, fixed and committed, not yet through CI:
  - `/api/auth/*` forwards only a per-method allowlist (`AUTH_PROXY_PATHS`: GET `get-session`;
    POST sign-in/email, sign-up/email, sign-out, sign-in/social, request-password-reset,
    reset-password, oauth2/continue, oauth2/consent); everything else, including PUT/PATCH/DELETE
    and non-canonical spellings, is 404 before any upstream call.
  - The OAuth pages serve only `EXTENSION_OAUTH_CLIENT_ID`; any other client gets "This link has
    expired" before Neon is called.
  - Limiter keys IPv6 by /64; sign-in/email and request-password-reset must be JSON with an
    `email` (415/400 otherwise) and also count per hashed email and IP (10/15 min) and per hashed
    email across IPs (sign-in 40/h, reset 5/h), separately per path.
  - Erase also deletes the user's rows from every `neon_auth` user-id table without a cascading
    FK, found from the catalog at erase time; `scripts/migrate.mjs` prints those tables and no
    longer fails on them (mirrored to `add/production-migrations`, PR #8).
- Verified 2026-11-09: the production issuer equals `NEON_AUTH_BASE_URL`; `NEON_AUTH_ISSUER` is
  not needed (OPEN_ITEMS.md Accepted).
- Next: push and read CI (unit, e2e on the Neon `ci` branch, `extension`); set
  `EXTENSION_OAUTH_CLIENT_ID` in Vercel (PLAN.md 12.4 step 8); user spike (step 11) once N4
  reaches production; reload the unpacked extension and sign in (step 13); N8 (review).
- Extension client contract: `docs/EXTENSION.md`. Routes and the auth allowlist:
  `docs/ROUTE-REGISTER.md`.
- CI status: green at `30d8c84`; later commits per the latest Actions run.
- Never executed against Postgres outside CI: the erase catalog query and statement, and every
  live Neon Auth call path listed in OPEN_ITEMS.md.
