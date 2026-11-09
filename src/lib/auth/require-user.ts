import { requireSessionAccount } from "@/lib/auth/require-session-account";
import type { AuthedUser } from "@/types/auth/auth";

/**
 * The signed-in caller of every `/api/v1/*` route except sync: Neon Auth session cookie only, so
 * cookie callers always pass through `assertSameOrigin` on mutations. 401 without a session or
 * with a bearer token, 503 when Neon Auth is unavailable (`requireSessionAccount`).
 */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const { userId } = await requireSessionAccount(request);
  return { userId, via: "session" };
}
