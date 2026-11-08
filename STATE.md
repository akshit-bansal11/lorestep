# State

Snapshot, rewritten in place (`.claude/CLAUDE.md` section 19).

- Branch: `feat/merge-plotline-dogear`, draft PR #7. Plan: `PLAN.md` (section 11 overrides the rest).
- Done: M1-M10, M12 (M11 in flight in parallel). M1 migration runner; M2 `0001_auth_tables`; M3 Better-Auth server and guards; M4
  `/sign-in`, `/sign-up`, `/reset-password`, header account control; M5 `0002_log_tables`; M6
  entries service and `/api/v1/entries*`; M7 `POST /api/v1/import/local` and signed-in sync
  (`src/utils/canon/entries-sync.ts`); M8 lists service and API; M9 `/api/v1/{metadata,search,
  resolve-link}`; M10 `/library` UI, with undo through `POST /api/v1/entries/:id/restore`; M12
  `/account` (devices, JSON export, type-the-email erase) and the daily `/api/cron/purge`
  (`vercel.json` crons, needs `CRON_SECRET`).
- Also done: sign-in and sign-up honour `?next=` (`src/utils/auth/safe-next-path.ts`); the sync
  client uses `apiRequest`/`apiSend`.
- CI status: unknown until the local commits are pushed. Last green CI was `0b84717`.
- Never executed: all migrations, the auth server against Neon, the M6/M7/M8 SQL, the restore
  SQL, the M12 erase and purge SQL, every browser test. The e2e job skips until `DATABASE_URL_CI` exists (OPEN_ITEMS.md).
- Routes: `docs/ROUTE-REGISTER.md`.
- Next: M11, then M13, D2-D3, P1. M13 must give Dogear a signed device token (OPEN_ITEMS.md)
  and should reuse `utils/log/entry-cursor.ts`.
