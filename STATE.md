# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 12, Neon Auth,
  overrides the rest). Nothing is deployed from this branch. Code complete.
- Done: M1-M13 (Better-Auth era); Neon Auth cutover N1-N8: `@neon/auth` 0.8.2, cookie-only
  `requireUser`, bearer-JWT-only sync, migrations 0001/0002 (FK to `neon_auth."user"`), account
  sessions, export and erase (one statement, including `neon_auth."user"` and every non-cascading
  `neon_auth` user table), `/oauth/login` and `/oauth/consent` (extension client only), the auth
  proxy per-method allowlist, IPv6 /64 and per-email limits, anti-framing headers, and the Chrome
  extension in `extension/` as "Lorestep for Chrome" (tokens in worker-only IndexedDB).
- CI status: green at `652303a`: lint, types, data, unit, `extension`, and 63 Playwright tests
  against the Neon `ci` branch with Neon Auth (sign-up/in/out, erase, import, library, lists,
  oauth pages). Final security review (N8) findings fixed and re-run green.
- Verified 2026-11-09: production issuer equals `NEON_AUTH_BASE_URL` (`NEON_AUTH_ISSUER` not
  needed); Neon accepted the extension redirect `https://hemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org/`;
  `neon_auth` session/account FKs cascade.
- Next (owner, PLAN.md 12.4): merge PR #8, run Migrate production with `seed=true`; set the Vercel
  env vars (step 8); merge this PR; then live checks (sign-up, headers, OAuth spike step 11,
  extension sign-in step 13); then retire the `dogear` and `plotline` repos (plotline PR #9 first).
- Never executed against production: migrations, catalog seed, every live Neon Auth call path
  (OPEN_ITEMS.md).
- Extension client contract: `docs/EXTENSION.md`. Routes and the auth allowlist:
  `docs/ROUTE-REGISTER.md`.
