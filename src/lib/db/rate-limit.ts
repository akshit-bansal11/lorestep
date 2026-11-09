import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";
import type { RateLimitResult } from "@/types/http/http";

/** Start of the fixed window holding `nowMs`, in epoch seconds. */
export function windowStartFor(nowMs: number, windowSec: number): number {
  const nowSec = Math.floor(nowMs / 1000);
  return nowSec - (nowSec % windowSec);
}

/** Whole seconds until the window holding `nowMs` closes (API-04 `Retry-After`), at least 1. */
export function retryAfterFor(nowMs: number, windowSec: number): number {
  return Math.max(1, windowStartFor(nowMs, windowSec) + windowSec - Math.ceil(nowMs / 1000));
}

/** The stored bucket key: the caller's bucket plus the window length, `<bucket>:<windowSec>`. */
export function bucketKey(bucket: string, windowSec: number): string {
  return `${bucket}:${windowSec}`;
}

/**
 * What every stored bucket of one user contains: user-keyed buckets are `<prefix>:<userId>`, so the
 * stored key is `<prefix>:<userId>:<windowSec>` (`bucketKey`). Erase matches on this (SEC-22).
 */
export function userBucketNeedle(userId: string): string {
  return `:${userId}:`;
}

/**
 * Fixed-window limiter: one atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` per call, so
 * concurrent requests can never both read the same count (PLAN.md D-11, a user decision that
 * overrides BACKEND-SPEC BE-10's token bucket; DECISIONS.md). The window length is part of the
 * bucket key so two limits on one bucket never share a row.
 *
 * Fails OPEN (BE-06): if the store is unreachable the request is allowed and the outage logged.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSec: number,
  nowMs = Date.now(),
): Promise<RateLimitResult> {
  const retryAfterSec = retryAfterFor(nowMs, windowSec);
  try {
    const [row] = await db()
      .insert(rateLimits)
      .values({
        bucket: bucketKey(bucket, windowSec),
        windowStart: windowStartFor(nowMs, windowSec),
        count: 1,
      })
      .onConflictDoUpdate({
        target: [rateLimits.bucket, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });
    return { allowed: row !== undefined && row.count <= limit, retryAfterSec };
  } catch (error) {
    console.warn(`Rate limiter unreachable; ${bucket} allowed (fail open)`, error);
    return { allowed: true, retryAfterSec };
  }
}
