/**
 * Every app limiter in one place (BACKEND-SPEC BE-D02). Fixed windows (PLAN.md D-11). Neon Auth's
 * own endpoint limits are undocumented; `auth` is our layer in front of them (PLAN.md N-5).
 */
export const RATE_LIMITS = {
  /** Per client IP: every POST to `/api/auth/*`. */
  auth: { limit: 30, windowSec: 60 },
  /** Per client IP and path, on top of `auth`: every POST not in `AUTH_NON_CREDENTIAL_PATHS`. */
  authCredential: { limit: 10, windowSec: 60 },
  /**
   * Per path, sha256 of the trimmed, lowercased body `email`, and client IP: POST
   * `AUTH_EMAIL_LIMITED_PATHS`. Strict, but an attacker elsewhere cannot spend a victim's budget.
   */
  authEmailIp: { limit: 10, windowSec: 900 },
  /**
   * Per email hash across every IP, the brute-force ceiling over `authEmailIp`. Sign-in: no higher
   * than the old effective rate. Password reset has its own, lower cap: each hit sends a mail.
   * Trade-off (lockout vs brute force): DECISIONS.md 2026-11-09 "Per-email auth limits".
   */
  authEmailSignIn: { limit: 40, windowSec: 3600 },
  authEmailReset: { limit: 5, windowSec: 3600 },
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
  /** Per user: account erase and session sign-out. */
  accountWrite: { limit: 10, windowSec: 60 },
  /** Per user: each export reads every row the user owns. */
  accountExport: { limit: 10, windowSec: 3600 },
  /** Per user, extension sync (PLAN.md M13). */
  syncPull: { limit: 60, windowSec: 60 },
  syncPush: { limit: 60, windowSec: 60 },
};
