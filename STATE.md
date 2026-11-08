# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 11 overrides the rest).
- Done and pushed: M1 (migration runner, `npm run db:migrate`, production via
  `.github/workflows/migrate.yml`), M2 (migration `0001_auth_tables`), M3 (Better-Auth server,
  guards `requireUser` / `assertSameOrigin` / `clientIp` / `rateLimit`), M4 (`/sign-in`,
  `/sign-up`, `/reset-password`, header account control), M5 (migration `0002_log_tables`:
  `entries`, `entry_links`, `lists`, `list_items`), M9 (`/api/v1/{metadata,search,resolve-link}`).
  Routes: `docs/ROUTE-REGISTER.md`.
- CI: lint/types/tests were green at `7e31244` (M3); later pushes failed only on Biome formatting.
  `.github/workflows/format-fix.yml` now formats feature branches in CI and commits the result.
- Never executed: both migrations, the auth server against Neon, every browser test. The e2e job
  skips until `DATABASE_URL_CI` exists (OPEN_ITEMS.md).
- Next: M6 (entries domain, status mapper + round-trip test), then M7, M8, M10-M13, D2-D3, P1.
  M13 must give Dogear a signed device token (OPEN_ITEMS.md).
