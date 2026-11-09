import { sql } from "drizzle-orm";

import { ACCOUNT_LIMITS } from "@/constants/account/account";
import { ENTRY_LIMITS } from "@/constants/log/entries";
import { db } from "@/lib/db/client";
import type { PurgeResult } from "@/types/account/account";

const DAY_MS = 86_400_000;

/**
 * The daily purge (DB-13), one atomic statement: soft-deleted entries and lists past the 30-day
 * restore window (their links and items cascade) and limiter rows older than a day. Sessions and
 * verifications are Neon Auth's to expire. Live rows are never touched: every predicate is a
 * strict "older than" on a cutoff computed from `now`.
 */
export async function purgeExpired(now: Date): Promise<PurgeResult> {
  const deletedBefore = new Date(now.getTime() - ENTRY_LIMITS.restoreWindowDays * DAY_MS);
  const limiterBeforeSec = Math.floor(now.getTime() / 1000) - ACCOUNT_LIMITS.limiterRetentionSec;
  const deleted = deletedBefore.toISOString();

  const result = await db().execute<PurgeResult>(sql`
    WITH purged_entries AS (DELETE FROM entries WHERE deleted_at < ${deleted}::timestamptz RETURNING 1),
      purged_lists AS (DELETE FROM lists WHERE deleted_at < ${deleted}::timestamptz RETURNING 1),
      purged_rate_limits AS (DELETE FROM rate_limits WHERE window_start < ${limiterBeforeSec}::bigint RETURNING 1)
    SELECT
      (SELECT count(*)::int FROM purged_entries) AS "entries",
      (SELECT count(*)::int FROM purged_lists) AS "lists",
      (SELECT count(*)::int FROM purged_rate_limits) AS "rateLimits"`);

  const [counts] = result.rows;
  if (counts === undefined) throw new Error("Purge returned no counts row.");
  return counts;
}
