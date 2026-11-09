import type { NextRequest } from "next/server";

import { ACCOUNT_LIMITS } from "@/constants/account/account";
import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { assertSameOrigin } from "@/lib/http/assert-same-origin";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { HttpError } from "@/lib/http/http-error";
import { fail, noContent } from "@/lib/http/respond";
import { revokeDeviceSession } from "@/services/account/sessions";
import type { SessionRouteContext } from "@/types/account/account";

/**
 * Sign one session out. The id must be in the caller's own Neon Auth `listSessions()`: unknown,
 * oversized or foreign id = 404 (never 403, PLAN.md N-10).
 */
export async function DELETE(request: NextRequest, { params }: SessionRouteContext) {
  try {
    const userId = await requireSessionUser(request);
    assertSameOrigin(request);
    await enforceRateLimit(`account:${userId}`, RATE_LIMITS.accountWrite);
    const { id } = await params;
    if (id.length > ACCOUNT_LIMITS.sessionIdMax || !(await revokeDeviceSession(id))) {
      throw new HttpError(404, "not_found", "That device is not signed in to your account.");
    }
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
