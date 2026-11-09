/** Account routes and the purge cron. The 30-day purge window is `ENTRY_LIMITS.restoreWindowDays`. */
export const ACCOUNT_LIMITS = {
  /** Body cap of DELETE /api/v1/account (`{confirm}` only). */
  bodyBytes: 4096,
  /** `rate_limits` rows older than this are purged. */
  limiterRetentionSec: 86_400,
  /** A session id longer than this is answered 404 without a query. */
  sessionIdMax: 128,
};
