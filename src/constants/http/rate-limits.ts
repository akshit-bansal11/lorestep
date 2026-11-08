/**
 * Every app limiter in one place (BACKEND-SPEC BE-D02). Fixed windows (PLAN.md D-11). Better-Auth's
 * own endpoint limits are `AUTH_RATE_RULES` in `constants/auth/auth.ts`.
 */
export const RATE_LIMITS = {
  /** Per client IP. */
  authProviders: { limit: 30, windowSec: 60 },
  /** Per user: each call fans out to paid or quota-limited third-party APIs. */
  metadata: { limit: 60, windowSec: 60 },
  search: { limit: 60, windowSec: 60 },
  resolveLink: { limit: 30, windowSec: 60 },
  /** Per user, every entries mutation (create, edit, delete, game status). */
  entriesWrite: { limit: 120, windowSec: 60 },
  /** Per user: a one-off bulk insert of up to 1000 rows. */
  importLocal: { limit: 10, windowSec: 3600 },
  /** Per user: account erase and device sign-out. */
  accountWrite: { limit: 10, windowSec: 60 },
  /** Per user: each export reads every row the user owns. */
  accountExport: { limit: 10, windowSec: 3600 },
};
