/**
 * Every table whose rows carry a `user_id` owned by one user, children first (DB-11, DB-D10).
 * Account erase deletes from each by `user_id`, then the `users` row itself. A new user-owned
 * table MUST be added here, or erase leaves an orphan.
 *
 * Erased separately, because they are not keyed by `user_id`: `rate_limits` (bucket
 * `<name>:<userId>`, matched by suffix) and `verifications` (a reset token's `value` is the user
 * id). Never attributable to a user, so left to expire and the purge cron: `auth_rate_limits`
 * (keyed by client IP and path) and other `verifications` rows (hashed identifiers).
 */
export const USER_TABLES: readonly string[] = [
  "entry_links",
  "list_items",
  "lists",
  "entries",
  "device_codes",
  "sessions",
  "accounts",
];
