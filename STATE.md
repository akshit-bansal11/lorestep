# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 11 overrides the rest).
- Done: M1-M13. M1 migration runner; M2 `0001_auth_tables`; M3 Better-Auth server and guards; M4
  `/sign-in`, `/sign-up`, `/reset-password`, header account control; M5 `0002_log_tables`; M6
  entries service and `/api/v1/entries*`; M7 `POST /api/v1/import/local` and signed-in sync
  (`src/utils/canon/entries-sync.ts`); M8 lists service and API; M9 `/api/v1/{metadata,search,
  resolve-link}`; M10 `/library` UI, with undo through `POST /api/v1/entries/:id/restore`; M11
  lists UI; M12 `/account` (devices, JSON export, type-the-email erase) and the daily
  `/api/cron/purge` (`vercel.json` crons, needs `CRON_SECRET`); M13 `/device` approval page,
  signed Dogear device token (after hook on `/api/auth/device/token`, DECISIONS.md), bearer-only
  `GET /api/v1/sync` and `POST /api/v1/sync/push` (`src/services/sync/*`).
- Dogear client contract: `docs/DOGEAR.md`. Routes: `docs/ROUTE-REGISTER.md`.
- CI status: unknown until the local commits are pushed. Last green CI was `0b84717`; CI was
  pending on `25b82ae` when M13 started. M13's code has never been typechecked, linted or tested.
- Never executed: all migrations, the auth server against Neon, every SQL statement since M6
  (entries, import, lists, restore, erase, purge, sync), device pairing, every browser test. The
  e2e job skips until `DATABASE_URL_CI` exists (OPEN_ITEMS.md).
- Next: push and read CI for M13, then D1-D3 in the Dogear repo (they consume `docs/DOGEAR.md`),
  then P1.
