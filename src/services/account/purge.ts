import { sql } from "drizzle-orm";

import { ACCOUNT_LIMITS } from "@/constants/account/account";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { db } from "@/lib/db/client";
import type { PurgeResult } from "@/types/account/account";

const DAY_MS = 86_400_000;

/**
 * The daily purge (DB-13), one atomic statement: soft-deleted entries and lists past the 30-day
 * restore window (their links and items cascade), expired sessions, verifications and device
 * codes, and limiter rows older than a day. Live rows are never touched: every predicate is a
 * strict "older than" on a cutoff computed from `now`.
 */
export async function purgeExpired(now: Date): Promise<PurgeResult> {
  const deletedBefore = new Date(now.getTime() - ENTRY_LIMITS.restoreWindowDays * DAY_MS);
  const limiterBeforeMs = now.getTime() - ACCOUNT_LIMITS.limiterRetentionSec * 1000;
  const deleted = deletedBefore.toISOString();
  const expired = now.toISOString();

  const result = await db().execute<PurgeResult>(sql`
    WITH purged_entries AS (DELETE FROM entries WHERE deleted_at < ${deleted}::timestamptz RETURNING 1),
      purged_lists AS (DELETE FROM lists WHERE deleted_at < ${deleted}::timestamptz RETURNING 1),
      purged_sessions AS (DELETE FROM sessions WHERE expires_at < ${expired}::timestamptz RETURNING 1),
      purged_verifications AS (DELETE FROM verifications WHERE expires_at < ${expired}::timestamptz RETURNING 1),
      purged_device_codes AS (DELETE FROM device_codes WHERE expires_at < ${expired}::timestamptz RETURNING 1),
      purged_rate_limits AS (DELETE FROM rate_limits WHERE window_start < ${Math.floor(limiterBeforeMs / 1000)}::bigint RETURNING 1),
      purged_auth_rate_limits AS (DELETE FROM auth_rate_limits WHERE last_request < ${limiterBeforeMs}::bigint RETURNING 1)
    SELECT
      (SELECT count(*)::int FROM purged_entries) AS "entries",
      (SELECT count(*)::int FROM purged_lists) AS "lists",
      (SELECT count(*)::int FROM purged_sessions) AS "sessions",
      (SELECT count(*)::int FROM purged_verifications) AS "verifications",
      (SELECT count(*)::int FROM purged_device_codes) AS "deviceCodes",
      (SELECT count(*)::int FROM purged_rate_limits) AS "rateLimits",
      (SELECT count(*)::int FROM purged_auth_rate_limits) AS "authRateLimits"`);

  const [counts] = result.rows;
  if (counts === undefined) throw new Error("Purge returned no counts row.");
  return counts;
}
