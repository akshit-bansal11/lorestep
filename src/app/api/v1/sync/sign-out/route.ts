import { RATE_LIMITS } from "@/constants/http/rate-limits";
import { requireBearerUser } from "@/lib/auth/require-bearer-user";
import { enforceRateLimit } from "@/lib/http/enforce-rate-limit";
import { fail, noContent } from "@/lib/http/respond";
import { revokeDeviceSession } from "@/services/account/sessions";

/**
 * Dogear signs itself out: deletes exactly the calling session row, scoped by owner and id. 204
 * whether or not the row was still there (a concurrent revoke already removed it), so it is safe
 * to resend; once the row is gone the token answers 401, which Dogear reads as signed out.
 */
export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await requireBearerUser(request);
    await enforceRateLimit(`sync-signout:${userId}`, RATE_LIMITS.syncSignOut);
    await revokeDeviceSession(userId, sessionId);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
