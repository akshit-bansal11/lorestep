import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";

/**
 * The caller of a mutating route: signed in by session cookie (`requireUser` accepts nothing
 * else), `assertSameOrigin`, then one hit in the per-user `bucket`. Returns the id.
 */
export async function guardMutation(
  request: NextRequest,
  bucket: string,
  limit: { limit: number; windowSec: number },
): Promise<string> {
  const { userId } = await requireUser(request);
  assertSameOrigin(request);
  await enforceRateLimit(`${bucket}:${userId}`, limit);
  return userId;
}
