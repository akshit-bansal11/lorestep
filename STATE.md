# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 11 overrides the rest).
- Done and pushed: M1 (migration runner, `npm run db:migrate`, production via
  `.github/workflows/migrate.yml`), M2 (migration `0001_auth_tables`), M3 (Better-Auth server,
  guards `requireUser` / `assertSameOrigin` / `clientIp` / `rateLimit`), M4 (`/sign-in`,
  `/sign-up`, `/reset-password`, header account control), M5 (migration `0002_log_tables`:
  `entries`, `entry_links`, `lists`, `list_items`), M9 (`/api/v1/{metadata,search,resolve-link}`).
- Done, committed, NOT pushed: M6 (status mapper `src/mappers/log/status-mapper.ts` with a
  round-trip test; `src/services/log/entries-service.ts`; `/api/v1/entries`, `/entries/:id`,
  `/entries/game/:gameId`; shared `guardMutation`, `readJson`, `noContent`). CI has not run it.
  Routes: `docs/ROUTE-REGISTER.md`.
- CI: green at `50d458f`. `.github/workflows/format-fix.yml` formats feature branches and commits.
- Never executed: both migrations, the auth server against Neon, the M6 SQL, every browser test.
  The e2e job skips until `DATABASE_URL_CI` exists (OPEN_ITEMS.md).
- Next: push M6 and read CI; then M7, M8, M10-M13, D2-D3, P1. M13 must give Dogear a signed
  device token (OPEN_ITEMS.md) and should reuse `utils/log/entry-cursor.ts`.
