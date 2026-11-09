/**
 * Every table whose rows carry a `user_id` owned by one user, children first (DB-11, DB-D10).
 * Account erase deletes from each by `user_id` in the statement that deletes the user. A new
 * user-owned table MUST be added here, or erase leaves an orphan until the FK cascade fires.
 *
 * Erased separately, because it is not keyed by `user_id`: `rate_limits` (bucket
 * `<name>:<userId>`, matched by `userBucketNeedle`). Accounts, sessions and credentials live in
 * Neon Auth's managed schema and cascade from the `neon_auth."user"` row erase deletes (N-10).
 */
export const USER_TABLES: readonly string[] = ["entry_links", "list_items", "lists", "entries"];
