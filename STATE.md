# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 11 overrides the rest).
- Done: M1-M13. M1 migration runner; M2 `0001_auth_tables`; M3 Better-Auth server and guards; M4
  auth pages; M5 `0002_log_tables`; M6 entries API; M7 local import and signed-in sync; M8 lists
  API; M9 metadata, search, resolve-link; M10 `/library`; M11 lists UI; M12 `/account`, export,
  erase, `/api/cron/purge`; M13 `/device`, signed Dogear device token, bearer-only
  `/api/v1/sync*`.
- Final security review fixes applied (local commits, unpushed): sessions carry a `client` column
  and authorization classifies by row, so a Dogear token sent as a cookie cannot export or erase
  (DECISIONS.md); erase now matches the stored `rate_limits` bucket format; resolve-link body is
  capped (413); a well-shaped but unreal cursor date is 400; OAuth keeps `?next=`; new
  `POST /api/v1/sync/sign-out`. Re-review: a Dogear session is refused (403) on every
  `/api/auth/*` path but get-session, sign-out and pairing, and treated as signed out by
  `/account` and `/device`; the device-token hook fails closed if the row is not marked; local
  import is browser-session only.
- Dogear client contract: `docs/DOGEAR.md`. Routes: `docs/ROUTE-REGISTER.md`.
- CI status: green at `286aedf` (lint, types, data, unit tests) after both security reviews and
  their fixes. Vercel preview of this branch builds.
- Never executed: all migrations, the auth server against Neon, every SQL statement since M6,
  device pairing, every browser test. Nothing DB-backed has run. The e2e job skips until
  `DATABASE_URL_CI` exists (OPEN_ITEMS.md).
- Code complete: M1-M13 here, D1-D3 in Dogear (PR dogear#1), P1 in Plotline (PR plotline#9).
- Deploy order (owner): provision secrets and env vars; merge PR #8 (migration runner only, so
  `migrate.yml` exists on `main`); run Migrate production; merge this PR (#7); verify sign-up live;
  then dogear#1, then plotline#9.
