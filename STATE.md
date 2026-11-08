# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 11 overrides the rest).
- Done and pushed: M1 (migration runner, `npm run db:migrate`, production via
  `.github/workflows/migrate.yml`), M2 (migration `0001_auth_tables`), M3 (Better-Auth server,
  guards `requireUser` / `assertSameOrigin` / `clientIp` / `rateLimit`), M4 (`/sign-in`,
  `/sign-up`, `/reset-password`, header account control), M5 (migration `0002_log_tables`:
  `entries`, `entry_links`, `lists`, `list_items`), M6 (`src/services/log/entries-service.ts`,
  `/api/v1/entries`, `/entries/:id`, `/entries/game/:gameId`), M9 (`/api/v1/{metadata,search,
  resolve-link}`). CI green at `0b84717`.
- Done, committed, NOT pushed: M7. `POST /api/v1/import/local` (`src/services/log/import-local.ts`,
  insert-if-absent, server wins); signed-in sync in `src/utils/canon/entries-sync.ts` (record under
  `isitcanon/import/v1`: decisions per user, the browser's own marks set aside while an account's
  fill the cache, unconfirmed edits queued per user); `ImportBanner` mounted in `CanonApp`;
  `e2e/import.spec.ts` (skips without `DATABASE_URL`). CI has not run it.
- In flight in the same tree: M8 (lists service/API), M10 (library UI). Routes:
  `docs/ROUTE-REGISTER.md` (M8 adds the M7 row).
- Never executed: both migrations, the auth server against Neon, the M6 and M7 SQL, every browser
  test. The e2e job skips until `DATABASE_URL_CI` exists (OPEN_ITEMS.md).
- Next: push M7 with M8/M10 and read CI; then M11-M13, D2-D3, P1. M13 must give Dogear a signed
  device token (OPEN_ITEMS.md) and should reuse `utils/log/entry-cursor.ts`.
