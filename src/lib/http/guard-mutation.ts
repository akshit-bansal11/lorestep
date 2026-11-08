import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";

/**
 * The caller of a mutating route: signed in, `assertSameOrigin` for cookie callers (bearer callers
 * carry no ambient credential and skip it), then one hit in the per-user `bucket`. Returns the id.
 */
export async function guardMutation(
  request: NextRequest,
  bucket: string,
  limit: { limit: number; windowSec: number },
): Promise<string> {
  const { userId, via } = await requireUser(request);
  if (via === "session") assertSameOrigin(request);
  await enforceRateLimit(`${bucket}:${userId}`, limit);
  return userId;
}
