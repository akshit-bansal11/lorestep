import { rateLimit } from "@/lib/db/rate-limit";
import { HttpError } from "@/lib/http/http-error";

/** Count one hit in `bucket`; throw the 429 (API-04, with `Retry-After`) once the cap is passed. */
export async function enforceRateLimit(
  bucket: string,
  { limit, windowSec }: { limit: number; windowSec: number },
): Promise<void> {
  const { allowed, retryAfterSec } = await rateLimit(bucket, limit, windowSec);
  if (!allowed) {
    throw new HttpError(429, "rate_limited", "Too many requests. Try again shortly.", {
      "Retry-After": String(retryAfterSec),
    });
  }
}
